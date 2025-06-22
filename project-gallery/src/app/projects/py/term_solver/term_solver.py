from flask import Flask
from flask import request

# complete api handler

app = Flask(__name__)

app.secret_key = '12345678'

@app.route('/solve')
def solveAPI():
    term = request.args.get('term')
    if not term:
        return "No term provided", 400

    try:
        result = solve_term(str(term))
        return result
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

