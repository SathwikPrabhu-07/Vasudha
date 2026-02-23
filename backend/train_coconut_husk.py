import os
import shutil
import zipfile
import subprocess
import pandas as pd
from prophet import Prophet
import pickle
import gc

DATASET_SLUG = "khandelwalmanas/daily-commodity-prices-india"
DOWNLOAD_DIR = "coconut_data"

def setup_kaggle():
    os.makedirs(os.path.expanduser("~/.kaggle"), exist_ok=True)
    shutil.copy("/content/kaggle.json",
                os.path.expanduser("~/.kaggle/kaggle.json"))
    os.chmod(os.path.expanduser("~/.kaggle/kaggle.json"), 0o600)

def download_dataset():
    os.makedirs(DOWNLOAD_DIR, exist_ok=True)
    subprocess.run([
        "kaggle", "datasets", "download",
        "-d", DATASET_SLUG,
        "-p", DOWNLOAD_DIR
    ], check=True)

    for file in os.listdir(DOWNLOAD_DIR):
        if file.endswith(".zip"):
            with zipfile.ZipFile(os.path.join(DOWNLOAD_DIR, file), "r") as z:
                z.extractall(DOWNLOAD_DIR)
    print(f"Files in {DOWNLOAD_DIR} after extraction: {os.listdir(DOWNLOAD_DIR)}")

def find_csv():
    # Check for a 'csv' subdirectory first
    csv_subdirectory_path = os.path.join(DOWNLOAD_DIR, 'csv')
    if os.path.isdir(csv_subdirectory_path):
        for file in os.listdir(csv_subdirectory_path):
            if file.endswith(".csv"):
                return os.path.join(csv_subdirectory_path, file)
    # If no 'csv' subdirectory or no CSVs found within, check the top level
    for file in os.listdir(DOWNLOAD_DIR):
        if file.endswith(".csv"):
            return os.path.join(DOWNLOAD_DIR, file)
    raise FileNotFoundError("CSV file not found")

def train_coconut_husk():
    csv_path = find_csv()
    # Read the CSV without specifying usecols to inspect actual columns
    temp_df = pd.read_csv(csv_path)
    print(f"CSV file columns: {temp_df.columns.tolist()}")

    df = pd.read_csv(csv_path, usecols=['Arrival_Date','Commodity','Modal_Price'])

    df = df[df['Commodity'].str.lower() == "coconut"].copy()

    if df.empty:
        raise ValueError("No Coconut data found in dataset")

    df['Arrival_Date'] = pd.to_datetime(df['Arrival_Date'], errors='coerce')
    df['Modal_Price'] = df['Modal_Price'].astype(str).str.replace(',', '')
    df['Modal_Price'] = pd.to_numeric(df['Modal_Price'], errors='coerce')

    df.dropna(subset=['Arrival_Date','Modal_Price'], inplace=True)
    df.sort_values('Arrival_Date', inplace=True)

    df = df.set_index('Arrival_Date')['Modal_Price'] \
           .resample('D') \
           .mean() \
           .interpolate() \
           .reset_index()

    df.rename(columns={'Arrival_Date':'ds','Modal_Price':'y'}, inplace=True)

    model = Prophet(yearly_seasonality=True)
    model.fit(df)

    future = model.make_future_dataframe(periods=60)
    forecast = model.predict(future)

    with open("coconut_husk_model.pkl","wb") as f:
        pickle.dump(model,f)

    print("Coconut Husk model trained and saved successfully.")

    del df, model, future, forecast
    gc.collect()

if __name__ == "__main__":
    setup_kaggle()
    download_dataset()
    train_coconut_husk()