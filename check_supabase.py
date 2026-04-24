import requests
import json

url = "https://rxulxpeiqmuunnlspmvd.supabase.co/rest/v1/visits"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWx4cGVpcW11dW5ubHNwbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTQxNzQsImV4cCI6MjA5MTI5MDE3NH0.yAk6IBuIF3PkrRug8OncwLlFFNxK0cNG9hT5uKfmMc4"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

try:
    r = requests.get(url, headers=headers)
    if r.status_code != 200:
        print(f"Error status {r.status_code}: {r.text}")
    else:
        data = r.json()
        print(f"Total rows: {len(data)}")
        if isinstance(data, list):
            for row in data:
                print(f"Date: {row.get('visit_date')} | Office: {row.get('office')} | Loc: {row.get('locataire_count')} | Pre: {row.get('prestataire_count')}")
        else:
            print("Response is not a list:", data)
except Exception as e:
    print(f"Unexpected Error: {e}")
