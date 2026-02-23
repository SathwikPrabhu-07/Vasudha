# train_models.py

import pandas as pd
from prophet import Prophet
import pickle
import gc
import os

def train_crop_model(csv_path, crop_name):
    """
    Trains a Prophet time-series model for a specific crop, forecasts future prices,
    and saves the model and a summary of the forecast.

    Args:
        csv_path (str): Path to the CSV file containing the commodity data for the crop.
                        It is assumed this CSV contains data specifically for 'crop_name'
                        or can be filtered effectively.
        crop_name (str): The name of the crop to filter and train the model for.

    Returns:
        dict: A dictionary containing a summary of the training and forecast, or error status.
    """
    print(f"\n--- Processing {crop_name} ---")

    # 1. Load only necessary columns from CSV
    try:
        # Assuming 'Date', 'Commodity', and 'Modal Price' columns are present
        # and the CSV is either specific to the crop or contains multiple commodities.
        raw_df = pd.read_csv(csv_path, usecols=['Date', 'Commodity', 'Modal Price'])
    except FileNotFoundError:
        print(f"Error: CSV file not found at {csv_path}.")
        return {
            "crop_name": crop_name,
            "status": "Failed - File Not Found",
            "message": f"CSV file not found at {csv_path}"
        }
    except KeyError as e:
        print(f"Error: Missing expected column in {csv_path}: {e}.")
        return {
            "crop_name": crop_name,
            "status": "Failed - Missing Column",
            "message": f"Missing expected column in {csv_path}: {e}"
        }

    # 2. Filter for the given crop (case-insensitive matching)
    crop_df = raw_df[raw_df['Commodity'].astype(str).str.lower() == crop_name.lower()].copy()

    if crop_df.empty:
        print(f"No data found for '{crop_name}' in {csv_path} after filtering. Skipping model training.")
        # Clear raw_df from memory before returning
        del raw_df
        gc.collect()
        return {
            "crop_name": crop_name,
            "status": "Skipped - No Data",
            "message": f"No data found for '{crop_name}' in {csv_path}"
        }

    # 3. Convert Date to datetime
    crop_df['Date'] = pd.to_datetime(crop_df['Date'], errors='coerce')

    # 4. Clean Modal Price (remove commas, convert to numeric)
    crop_df['Modal Price'] = crop_df['Modal Price'].astype(str).str.replace(',', '', regex=False)
    crop_df['Modal Price'] = pd.to_numeric(crop_df['Modal Price'], errors='coerce')

    # 5. Drop null values from essential columns
    crop_df.dropna(subset=['Date', 'Modal Price'], inplace=True)

    if crop_df.shape[0] < 2:
        print(f"Not enough data points ({crop_df.shape[0]}) for '{crop_name}' after cleaning. Skipping model training.")
        del raw_df, crop_df
        gc.collect()
        return {
            "crop_name": crop_name,
            "status": "Skipped - Insufficient Data",
            "message": f"Insufficient data points ({crop_df.shape[0]}) for '{crop_name}' after cleaning"
        }

    # 6. Sort by date
    crop_df.sort_values('Date', inplace=True)

    # 7. Resample to daily frequency and 8. Interpolate missing values
    # Set 'Date' as index for resampling, then apply mean and interpolate
    crop_df = crop_df.set_index('Date')['Modal Price'].resample('D').mean().interpolate(method='linear').reset_index()

    if crop_df.shape[0] < 2:
        print(f"Not enough data points ({crop_df.shape[0]}) for '{crop_name}' after resampling and interpolation. Skipping model training.")
        del raw_df, crop_df
        gc.collect()
        return {
            "crop_name": crop_name,
            "status": "Skipped - Insufficient Resampled Data",
            "message": f"Insufficient data points ({crop_df.shape[0]}) for '{crop_name}' after resampling and interpolation"
        }

    # 9. Remove extreme outliers using 5th and 95th percentile
    lower_bound = crop_df['Modal Price'].quantile(0.05)
    upper_bound = crop_df['Modal Price'].quantile(0.95)
    crop_df = crop_df[(crop_df['Modal Price'] >= lower_bound) & (crop_df['Modal Price'] <= upper_bound)].copy()

    if crop_df.shape[0] < 2:
        print(f"Not enough data points ({crop_df.shape[0]}) for '{crop_name}' after outlier removal. Skipping model training.")
        del raw_df, crop_df
        gc.collect()
        return {
            "crop_name": crop_name,
            "status": "Skipped - Insufficient Data After Outlier Removal",
            "message": f"Insufficient data points ({crop_df.shape[0]}) for '{crop_name}' after outlier removal"
        }

    # 10. Rename columns to Prophet format (ds, y)
    crop_df.rename(columns={'Date': 'ds', 'Modal Price': 'y'}, inplace=True)

    # 11. Train Prophet with yearly seasonality enabled
    model = Prophet(yearly_seasonality=True)
    model.fit(crop_df)

    # 12. Forecasts next 60 days
    future = model.make_future_dataframe(periods=60)
    forecast = model.predict(future)

    # 13. Extracts: predictedMinPrice, predictedMaxPrice, trend
    # Focus on the forecasted 60-day period
    forecast_60_days = forecast.tail(60)

    predicted_min_price = forecast_60_days['yhat_lower'].min()
    predicted_max_price = forecast_60_days['yhat_upper'].max()

    # Determine trend: compare the start and end of the forecast's 'yhat'
    trend_start = forecast_60_days['yhat'].iloc[0]
    trend_end = forecast_60_days['yhat'].iloc[-1]
    trend_direction = "Increasing" if trend_end > trend_start else "Decreasing" if trend_end < trend_start else "Stable"

    # 14. Saves model as {crop_name.lower()}_model.pkl
    model_filename = f"{crop_name.lower().replace(' ', '_')}_model.pkl"
    try:
        with open(model_filename, 'wb') as f:
            pickle.dump(model, f)
        print(f"Model for '{crop_name}' saved as {model_filename}")
    except Exception as e:
        print(f"Error saving model for '{crop_name}': {e}")
        del raw_df, crop_df, model, future, forecast, forecast_60_days
        gc.collect()
        return {
            "crop_name": crop_name,
            "status": "Failed - Model Save Error",
            "message": f"Error saving model: {e}"
        }

    # 15. Prints summary output dictionary
    summary = {
        "crop_name": crop_name,
        "status": "Success",
        "model_file": model_filename,
        "forecast_period_days": 60,
        "predictedMinPrice": round(predicted_min_price, 2) if predicted_min_price is not None else None,
        "predictedMaxPrice": round(predicted_max_price, 2) if predicted_max_price is not None else None,
        "trend": trend_direction,
        "historical_data_range": {
            "start": crop_df['ds'].min().strftime('%Y-%m-%d') if not crop_df.empty else None,
            "end": crop_df['ds'].max().strftime('%Y-%m-%d') if not crop_df.empty else None
        }
    }
    print(f"Summary for '{crop_name}': {summary}")

    # 16. Clears memory after each training
    del raw_df, crop_df, model, future, forecast, forecast_60_days
    gc.collect()
    print(f"Memory cleared for {crop_name}.")

    return summary

if __name__ == "__main__":
    # --- Dummy CSV Data Generation for testing in Colab --- #
    # In a real scenario, you would have these CSV files pre-downloaded.
    # This block creates simple dummy CSVs if they don't exist,
    # to make the script immediately runnable for demonstration.
    # You should replace these with your actual data paths.

    crops_to_process = ["Tomato", "Maize", "Cotton", "Coconut", "Onion"]
    dummy_csv_dir = "dummy_crop_data"
    os.makedirs(dummy_csv_dir, exist_ok=True)

    for crop in crops_to_process:
        csv_filename = os.path.join(dummy_csv_dir, f"{crop.lower()}.csv")
        if not os.path.exists(csv_filename):
            print(f"Generating dummy data for {crop} at {csv_filename}...")
            dates = pd.date_range(start='2020-01-01', periods=365*3, freq='D') # 3 years of daily data
            modal_prices = pd.Series([100 + i * 0.5 + (i % 30) * 2 + (i % 90) * -1 for i in range(len(dates))])
            modal_prices = modal_prices.rolling(window=7, min_periods=1).mean() # Smooth out a bit
            modal_prices += 50 * (dates.month % 4) # Add some seasonality
            modal_prices = modal_prices.astype(int) # Convert to int prices

            # Add some outliers
            modal_prices.iloc[::100] += 500
            modal_prices.iloc[::150] -= 300

            # Introduce some NaNs
            modal_prices.iloc[50:60] = None

            dummy_df = pd.DataFrame({
                'Date': dates,
                'Commodity': crop,
                'Modal Price': modal_prices
            })
            dummy_df.to_csv(csv_filename, index=False)
        else:
            print(f"Using existing dummy data for {crop} at {csv_filename}.")

    # --- End Dummy CSV Data Generation --- #

    # Main execution for the specified crops
    all_summaries = []
    for crop in crops_to_process:
        current_csv_path = os.path.join(dummy_csv_dir, f"{crop.lower()}.csv") # Use dummy path
        summary = train_crop_model(current_csv_path, crop)
        all_summaries.append(summary)

    print("\n--- All Training Summaries ---")
    for s in all_summaries:
        print(s)
