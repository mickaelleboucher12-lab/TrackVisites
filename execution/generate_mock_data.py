import json
import random
from datetime import datetime, timedelta

def generate_mock_data(days=120):
    offices = ['montreux', 'la-chartire', 'st-exupery', 'le-pre', 'la-suze']
    history_data = {}
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    for office in offices:
        office_data = {}
        current_date = start_date
        while current_date <= end_date:
            date_str = current_date.strftime('%Y-%m-%d')
            # Random counts with some logic (higher on weekdays)
            is_weekend = current_date.weekday() >= 5
            base_loc = 5 if is_weekend else 20
            base_pre = 2 if is_weekend else 8
            
            office_data[date_str] = {
                'locataire': random.randint(base_loc, base_loc + 30),
                'prestataire': random.randint(base_pre, base_pre + 15)
            }
            current_date += timedelta(days=1)
        history_data[office] = office_data
    
    return history_data

if __name__ == "__main__":
    data = generate_mock_data()
    # Output the JSON so the user or agent can copy-paste it into localStorage for testing
    print(json.dumps(data, indent=2))
    
    with open('.tmp/mock_history.json', 'w') as f:
        json.dump(data, f, indent=2)
    print("\n[SUCCESS] Mock data generated in .tmp/mock_history.json")
