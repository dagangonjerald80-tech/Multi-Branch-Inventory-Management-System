import requests

BASE_URL = "http://127.0.0.1:8000/api"

def test_endpoint(endpoint):
    url = f"{BASE_URL}/{endpoint}/"
    print(f"Testing {url}...")
    try:
        response = requests.get(url)
        print(f"Status: {response.status_code}")
        if response.status_code == 400:
            print(f"Error Content: {response.content}")
        return response.status_code
    except Exception as e:
        print(f"Error: {e}")
        return None

endpoints = ["branches", "products", "stocks", "transfers", "history", "dashboard"]

for ep in endpoints:
    test_endpoint(ep)

# Test specific detail urls reported as 400
test_endpoint("products/1")
test_endpoint("stocks/1")
