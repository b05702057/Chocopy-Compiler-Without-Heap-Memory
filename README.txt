1. 
The first example would be the "/" operator. 
When my PA faces a "/" operator, it would throw an error of "PARSE ERROR: unknown binary operator". 
Since the SPEC doesn't ask us to implement the operator and there are many edge cases with it, 
such as types of integers and floats,I decided to consider it an error.
To support it in the future, I will implement it in a way similar to the implementations of other binary operators,
but I will need to be careful of the division results of floats and the condition of division by zero.

The second and the third example would be the ceiling function and the floor function.
When my PA faces these two functions, it would throw the error "PARSE ERROR: unknown builtin1".
I made this decision since these functions are not required by the SPEC and they are not used really often.
To suppor them in the future, I will implement them in a way similar to the implementations of the abs function.
The implementations wouldn't be too difficult since they are all from the math library.

2.
The TA tutorial is extremely helpful for this assignment.
The code is actually really complicated and difficult to understand.
It's not possible to finish this assignment in such a short time without his tutorial.

3.
I didn't work with others for this assignment, but I did ask a lot of questions on Piazza.
