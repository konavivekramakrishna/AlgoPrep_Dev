"""

for each step, calculate how many boxes are there from left and right and add it to ans
prefix logic, and also left and right moves will be added to curr moves + left boxes + right boxes

TC : O(n)
SC : O(1)


"""

class Solution:
    def minOperations(self, boxes: str) -> List[int]:

        n = len(boxes)
        boxesToLeft = 0
        boxesToRight = 0
        leftMoves = 0
        rightMoves = 0
        answer = [0] * n

        for i in range(n):

            answer[i] += leftMoves
            boxesToLeft += int(boxes[i])
            leftMoves += boxesToLeft

            # reverse direction
            j = n - i - 1
            answer[j] += rightMoves
            boxesToRight += int(boxes[j])
            rightMoves += boxesToRight
        
        return answer


    """
        moveLeft = [0] * n
        moveRight = [0] * n

        ballsToLeft = int(boxes[0])

        for i in range(1, n):
            moveLeft[i] = moveLeft[i-1] + ballsToLeft
            ballsToLeft += int(boxes[i])
        
        ballsToRight = int(boxes[-1])
        for i in range(n-2, -1, -1):
            moveRight[i] = moveRight[i+1] + ballsToRight
            ballsToRight += int(boxes[i])
        

        answer = [0] * n
        for i in range(n):
            answer[i] = moveRight[i] + moveLeft[i]
        
        return answer
    """


        