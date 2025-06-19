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

print(solve_term("2+1*3+3"))