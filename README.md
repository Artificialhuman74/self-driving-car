# F1 Driver

A self-driving F1 car that learns to drive around a track using neuroevolution. A population of cars, each controlled by a small neural network, races around the track. The best cars are kept, mutated, and passed to the next generation until they learn to drive.

- **Frontend:** p5.js sketch that draws the track and the cars (`app/sketch.js`)
- **Backend:** Flask server that holds the neural networks and the evolution logic (`app/brain.py`)
- **Trained driver:** `app/best.npy` is the best genome found so far, so you can watch it drive without training from scratch

## A note on how this was built

All the code, design and thinking in this project is my own. I used AI only as a guide to help me understand concepts and work through the project. None of the code was AI-generated.

## Run it yourself

You need Python 3 and a browser.

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/<repo-name>.git
cd <repo-name>/app

# 2. (Recommended) create a virtual environment
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Start the brain server (must be run from inside the app/ folder)
python brain.py
```

You should see `loaded best.npy` and the server starts on `http://localhost:5001`.

In a **second terminal**, serve the frontend from the same `app/` folder:

```bash
cd <repo-name>/app
python3 -m http.server 8000
```

Then open **http://localhost:8000** in your browser. The cars will start driving, starting from the saved best driver.

## Notes

- Run `python brain.py` from inside `app/`. It looks for `best.npy` in the current directory.
- Keep the backend running while the page is open. The sketch asks it for every steering decision.
- While it runs, the server prints each generation's best fitness. Whenever a new all-time best appears, `best.npy` is overwritten. To start training from scratch, delete `best.npy` before launching.
- If port 5001 or 8000 is taken, change the port in `app.run(port=...)` in `brain.py` and in the `fetch` URLs in `sketch.js`, or pick a different port for `http.server`.
