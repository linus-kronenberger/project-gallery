from flask import Flask
from flask import request
from flask_cors import CORS

# flask --app term_solver.py run

app = Flask(__name__)
cors = CORS(app, origins="http://localhost:3000")

app.secret_key = '12345678'

@app.route('/solve', methods=['POST'])
def solveAPI():
    term = request.json['term']
    if not term:
        return "No term provided", 400
    try:
        result = solve_term(str(term))
        return str(result)
    except Exception as e:
        return str(e), 500


def solve_term(term):
    number = int(term[0])
    operator = term[1]
    number2 = int(term[2])

    if len(term) == 3:
        if(operator == "+"):
            return str(number + number2)
        else:
            print("res: " + str(number * number2))
            return str(number * number2)
    elif operator != "*":
        return solve_term(str(number) + "+" + str(solve_term(term[2:])))
    else:
        result = number * number2
        return str(solve_term(str(result) + term[3:]))

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response
