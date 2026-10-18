import os
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS


POP = 30            # cars per generation
ELITE = 4           # best cars kept unchanged
MUT_RATE = 0.1      # chance that each number gets changed
MUT_SIZE = 0.4      # how big a change can be

def mutate(parent):
    child = parent.copy()
    mask = np.random.rand(50) < MUT_RATE              # which numbers change
    child = child + mask * np.random.randn(50) * MUT_SIZE
    return child

best_fitness = -1
best_genome = None

if os.path.exists("best.npy"):
    best_genome = np.load("best.npy")
    population = [best_genome.copy()]                 # the saved best, unchanged
    while len(population) < POP:
        population.append(mutate(best_genome))
    print("loaded best.npy")
else:
    population = [np.random.randn(50) for _ in range(POP)]
fitnesses = [None] * POP
generation = 0
def layer(inputs, weights, biases):
    z = np.dot(weights, inputs) + biases
    return np.tanh(z)


def think(inputs, w1, w2, b1, b2):
    l1_op = layer(inputs, w1, b1)
    zo = np.dot(w2, l1_op) + b2
    return np.tanh(zo)

def genome_to_weights(g):
    w1 = np.array(g[0:30]).reshape(6, 5)
    b1 = np.array(g[30:36])
    w2 = np.array(g[36:48]).reshape(2, 6)
    b2 = np.array(g[48:50])
    return w1, b1, w2, b2


def evolve():
    global population, fitnesses, generation, best_fitness, best_genome
    order = np.argsort(fitnesses)[::-1]               # best car first
    best = [population[i] for i in order[:ELITE]]
    print("generation", generation, "best fitness", fitnesses[order[0]])

    if fitnesses[order[0]] > best_fitness:            # new all-time best
        best_fitness = fitnesses[order[0]]
        best_genome = population[order[0]].copy()
        np.save("best.npy", best_genome)
        print("saved new best, fitness", best_fitness)

    new_pop = [g.copy() for g in best]                # the elite survive as they are
    while len(new_pop) < POP:
        parent = best[np.random.randint(ELITE)]
        new_pop.append(mutate(parent))

    population = new_pop
    fitnesses = [None] * POP
    generation += 1

#flask server 

app = Flask(__name__) 

CORS(app)
@app.route("/think", methods=["POST"])
def make_brain_work():
    data = request.get_json()
    w1, b1, w2, b2 = genome_to_weights(population[data["id"]])
    out = think(data["inputs"], w1, w2, b1, b2)
    return jsonify({"steer": float(out[0]), "gas": float(out[1])})


@app.route("/report", methods=["POST"])
def report():
    data = request.get_json()
    fitnesses[data["id"]] = data["fitness"]
    if all(f is not None for f in fitnesses):         # everybody has finished
        evolve()
    return jsonify({"generation": generation})


@app.route("/best", methods=["GET"])
def get_best():
    if best_genome is None:
        return jsonify({"error": "no best genome yet"}), 404
    return jsonify({"fitness": best_fitness, "genome": best_genome.tolist()})



app.run(port=5001)