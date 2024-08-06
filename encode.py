import base64
import sys


email = sys.argv[1]
pwd = sys.argv[2]

token = email + ":" + pwd

print(base64.b64encode(token.encode('utf-8')))
