import pandas as pd
from sklearn.datasets import fetch_openml

def main():
    print("Fetching Give-Me-Some-Credit dataset from OpenML...")
    # Fetch dataset
    data = fetch_openml(name='Give-Me-Some-Credit', version=1, as_frame=True, parser='auto')
    df = data.frame
    
    # Save to CSV
    output_path = 'data/cs-training.csv'
    print(f"Saving to {output_path}...")
    df.to_csv(output_path, index=False)
    print(f"Successfully saved {len(df)} rows and {len(df.columns)} columns.")

if __name__ == "__main__":
    main()
