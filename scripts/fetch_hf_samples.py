import os
from datasets import load_dataset
import json

def fetch_samples():
    print("Fetching samples from HuggingFace (sweatSmile/medical-symptom-triage)...")
    
    try:
        # Load the dataset
        # This dataset contains symptoms and their corresponding triage/urgency levels
        ds = load_dataset("sweatSmile/medical-symptom-triage", split="train", streaming=True)
        
        # Take a few samples
        samples = []
        for i, entry in enumerate(ds.take(5)):
            # Mapping typical HF dataset fields to our App's structure
            # Note: Fields might vary, this is a best-guess based on standard triage datasets
            sample = {
                "id": i + 1,
                "symptoms": entry.get("text", entry.get("symptoms", "No symptoms provided")),
                "expected_urgency": entry.get("label", entry.get("urgency", "Unknown")),
                "age": 45, # Mock age as it's often missing in simple text datasets
                "sex": "M"
            }
            samples.append(sample)
            print(f"Sample {i+1} fetched.")

        # Output to a JSON file for the user to use
        output_file = os.path.join(os.path.dirname(__file__), "../data/test_samples.json")
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(samples, f, indent=2)
            
        print(f"\nSuccess! 5 samples saved to: {os.path.abspath(output_file)}")
        print("\nYou can use these symptoms to test the 'Analyze with Gemma 4' button in your UI.")
        
    except Exception as e:
        print(f"Error fetching dataset: {e}")
        print("Tip: Make sure you have 'datasets' installed: pip install datasets")

if __name__ == "__main__":
    fetch_samples()
