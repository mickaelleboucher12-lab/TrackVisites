
import requests
import json

url = "https://rxulxpeiqmuunnlspmvd.supabase.co/rest/v1/visits"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4dWx4cGVpcW11dW5ubHNwbXZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzNzI1MzcsImV4cCI6MjA1Nzk0ODUzN30.S6v3oN2KImK_Vj3tA0yF_H2b5U4G59xZ7G7-cAt8lA0"

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

try:
    r = requests.get(url, headers=headers)
    data = r.json()
    print(f"Total rows: {len(data)}")
    if len(data) > 0:
        print("Data summary:")
        offices = {}
        for row in data:
            o = row['office']
            offices[o] = offices.get(o, 0) + 1
        print(offices)
except Exception as e:
    print(f"Error: {e}")
