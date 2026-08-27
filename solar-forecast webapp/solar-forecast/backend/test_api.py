"""
Unit and integration tests for FastAPI backend endpoints.
"""

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["backend"] == "ok"
    assert "state_map" in data["model_connection"]
    print("Health check PASSED:", data["backend"], "States count:", len(data["model_connection"]["state_map"]))

def test_existing_plants_list():
    res = client.get("/api/plants/existing")
    assert res.status_code == 200
    plants = res.json()["plants"]
    assert len(plants) == 50  # 0 to 50 excluding 13 = 50 plants
    plant_ids = [p["plant_id"] for p in plants]
    assert 13 not in plant_ids
    assert 0 in plant_ids
    assert 50 in plant_ids
    print("Existing plants list test PASSED! Exactly 50 plants, 13 excluded.")

def test_forecast_existing_plant():
    res = client.post("/api/forecast/existing-plant", json={"plant_id": 5})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "is_simulated" in data
    assert "simulation_reason" in data
    assert "power_source" in data
    assert "power_kw" in data["prediction"]
    assert "target_datetime" in data["prediction"]
    assert len(data["weather_sequence"]) == 192
    assert "total_active_power_w" in data["weather_sequence"][0]
    print(f"Forecast existing plant PASSED! is_simulated={data['is_simulated']} ({data['simulation_reason']})")

def test_forecast_existing_plant_13_excluded():
    res = client.post("/api/forecast/existing-plant", json={"plant_id": 13})
    assert res.status_code == 422 or res.status_code == 400
    print("Exclusion of Plant 13 validation PASSED!")

def test_forecast_new_plant():
    payload = {
        "nominal_power_mw": 50.0,
        "number_of_panels": 100000,
        "panel_efficiency_percentage": 21.5,
        "panel_temperature_coefficient": -0.35,
        "panel_bifaciality_coefficient": 0.70,
        "structure_type": "TRACKER",
        "brazilian_state": "Distrito Federal",
        "latitude": -15.78,
        "longitude": -47.93
    }
    res = client.post("/api/forecast/new-plant", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "is_simulated" in data
    assert data["power_source"] == "estimated"
    assert len(data["weather_sequence"]) == 192
    assert "total_active_power_w" in data["weather_sequence"][0]
    print(f"Forecast new plant (estimated) PASSED! Power kW: {data['prediction']['power_kw']}, is_simulated={data['is_simulated']}")

    # Test Power History Upload (Fix Issue #5)
    # 1. Fetch valid timestamps from response
    valid_timestamps = [row["datetime"] for row in data["weather_sequence"]]
    
    # Test mismatched timestamps failure
    bad_payload = dict(payload)
    bad_payload["power_history"] = [{"datetime": "2020-01-01T00:00:00", "power_w": 1000.0}] * 192
    bad_res = client.post("/api/forecast/new-plant", json=bad_payload)
    assert bad_res.status_code == 400
    print("Mismatched power_history validation PASSED (rejected with 400)!")

    # Test valid power history upload
    good_payload = dict(payload)
    good_payload["power_history"] = [
        {"datetime": ts, "power_w": 25_000_000.0} for ts in valid_timestamps
    ]
    good_res = client.post("/api/forecast/new-plant", json=good_payload)
    assert good_res.status_code == 200
    good_data = good_res.json()
    assert good_data["power_source"] == "user_uploaded"
    # 25,000,000 W / (50 * 1,000,000 W) = 0.50
    assert abs(good_data["weather_sequence"][0]["total_active_power_w"] - 0.50) < 1e-4
    print("Valid power_history upload PASSED! power_source='user_uploaded', normalized power=0.50")

def test_forecast_new_plant_international_benban_egypt():
    payload = {
        "country": "Egypt",
        "region": "Aswan",
        "nominal_power_mw": 1650.0,
        "number_of_panels": 3200000,
        "panel_efficiency_percentage": 21.0,
        "panel_temperature_coefficient": -0.36,
        "panel_bifaciality_coefficient": 0.70,
        "structure_type": "TRACKER",
        "latitude": 24.41,
        "longitude": 32.69
    }
    res = client.post("/api/forecast/new-plant", json=payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["plant_metadata"]["country"] == "Egypt"
    assert data["plant_metadata"]["region"] == "Aswan"
    assert data["plant_metadata"]["latitude"] == 24.41
    assert data["plant_metadata"]["longitude"] == 32.69
    assert len(data["weather_sequence"]) == 192
    assert "power_kw" in data["prediction"]
    assert data["prediction"]["power_kw"] > 0, f"Expected positive daytime prediction for Benban, got {data['prediction']['power_kw']}"
    assert data["prediction"]["night_masked"] is False

def test_geofencing_validation():
    # 1. Seamlessly accept coordinates outside Brazil even if country default was "Brazil"
    international_coords_payload = {
        "country": "Brazil",
        "region": "Bahia",
        "nominal_power_mw": 50.0,
        "number_of_panels": 100000,
        "panel_efficiency_percentage": 21.5,
        "panel_temperature_coefficient": -0.35,
        "panel_bifaciality_coefficient": 0.70,
        "structure_type": "TRACKER",
        "latitude": 24.41,   # Benban, Egypt coords entered with default Brazil
        "longitude": 32.69
    }
    res = client.post("/api/forecast/new-plant", json=international_coords_payload)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}: {res.text}"
    data = res.json()
    assert data["success"] is True
    assert data["plant_metadata"]["latitude"] == 24.41
    assert data["plant_metadata"]["longitude"] == 32.69
    print("Seamless acceptance of international coordinates (Benban, Egypt) PASSED!")

    # 2. Accept same coordinates when country="Egypt"
    good_egypt_payload = dict(international_coords_payload)
    good_egypt_payload["country"] = "Egypt"
    good_egypt_payload["region"] = "Aswan"
    res_good = client.post("/api/forecast/new-plant", json=good_egypt_payload)
    assert res_good.status_code == 200
    print("Explicit country='Egypt' registration PASSED!")

    # 3. Reject global invalid coordinates (e.g. lat > 90)
    invalid_coords_payload = dict(good_egypt_payload)
    invalid_coords_payload["latitude"] = 120.0
    res_invalid = client.post("/api/forecast/new-plant", json=invalid_coords_payload)
    assert res_invalid.status_code == 400
    print("Global out-of-range coordinates rejection PASSED!")

if __name__ == "__main__":
    test_health()
    test_existing_plants_list()
    test_forecast_existing_plant_13_excluded()
    test_forecast_existing_plant()
    test_forecast_new_plant()
    test_forecast_new_plant_international_benban_egypt()
    test_geofencing_validation()
    print("\nALL BACKEND API & INTERNATIONAL TESTS PASSED SUCCESSFULLY!")
