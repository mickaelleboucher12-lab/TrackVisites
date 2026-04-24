import requests
import json

url = "https://rxulxpeiqmuunnlspmvd.supabase.co/rest/v1/visits?order=visit_date.asc"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWx4cGVpcW11dW5ubHNwbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTQxNzQsImV4cCI6MjA5MTI5MDE3NH0.yAk6IBuIF3PkrRug8OncwLlFFNxK0cNG9hT5uKfmMc4"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

r = requests.get(url, headers=headers)
data = r.json()

if isinstance(data, list):
    print(f"Total rows in DB: {len(data)}")
    if data:
        print("\nAll entries:")
        for row in data:
            print(f"  {row['visit_date']} | {row['office']} | loc={row['locataire_count']} | pre={row['prestataire_count']} | conso={row.get('is_consolidation', False)}")
    else:
        print("La base de données est VIDE.")
else:
    print(f"Response: {data}")
