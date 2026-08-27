"""
Test script for weather pipeline and pvlib calculations.
"""

from weather_pipeline import process_weather_data
from feature_engineering import engineer_features

def test_pipeline():
    print("Testing weather pipeline for Brazil (-15.78, -47.93) with TRACKER (50 MW, 21.5% eff)...")
    tracker_seq, tracker_diag = process_weather_data(
        lat=-15.78,
        lon=-47.93,
        is_tracker=1,
        nominal_power_mw=50.0,
        panel_efficiency_percentage=21.5
    )
    
    assert len(tracker_seq) == 192, f"Expected 192 rows, got {len(tracker_seq)}"
    expected_fields = {
        "datetime",
        "total_active_power_w",  # Fix Issue #1
        "poa_irradiance_wm2",
        "ghi_irradiance_wm2",
        "ambient_temperature_celsius",
        "panel_temperature_celsius",
        "wind_speed_ms",
        "wind_direction_degrees"
    }
    
    for idx, row in enumerate(tracker_seq):
        assert set(row.keys()) == expected_fields, f"Row {idx} keys mismatch: {set(row.keys())}"
        assert isinstance(row["datetime"], str)
        assert isinstance(row["total_active_power_w"], (int, float))
        assert 0.0 <= row["total_active_power_w"] <= 1.0, f"Row {idx} power out of bounds [0, 1]: {row['total_active_power_w']}"
        assert isinstance(row["poa_irradiance_wm2"], (int, float))
        assert isinstance(row["ghi_irradiance_wm2"], (int, float))
        assert isinstance(row["ambient_temperature_celsius"], (int, float))
        assert isinstance(row["panel_temperature_celsius"], (int, float))
        assert isinstance(row["wind_speed_ms"], (int, float))
        assert isinstance(row["wind_direction_degrees"], (int, float))

    print("Tracker test passed! First row:", tracker_seq[0])
    print("Last row:", tracker_seq[-1])
    print("Tracker diagnostics:", tracker_diag)

    # Test feature engineering module consumes it cleanly
    df_features = engineer_features(tracker_seq)
    assert "total_active_power_w" in df_features.columns
    assert "hour_sin" in df_features.columns
    print(f"Feature engineering verification PASSED! Shape: {df_features.shape}")

    print("\nTesting weather pipeline with FIXED tilt (20 MW, 18.0% eff)...")
    fixed_seq, fixed_diag = process_weather_data(
        lat=-15.78,
        lon=-47.93,
        is_tracker=0,
        nominal_power_mw=20.0,
        panel_efficiency_percentage=18.0
    )
    assert len(fixed_seq) == 192
    assert "total_active_power_w" in fixed_seq[0]
    print("Fixed tilt test passed! Diagnostics:", fixed_diag)
    print("\nAll pipeline tests PASSED successfully!")

if __name__ == "__main__":
    test_pipeline()
