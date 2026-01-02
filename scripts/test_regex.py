import re

text = "gpuStatus.set({ available: true: layers: 35, 35: 35, memory: 8192 });"

# Pattern: word/number: <value>: word
pattern = r'([a-zA-Z_$][\w$]*|"[^"]+"|\'[^\']+\'|\d+)\s*:\s*([^:,{}\n]+?)\s*:\s*([a-zA-Z_$][\w$]*)'

result = re.sub(pattern, r'\1: \2, \3', text)

print("BEFORE:", text)
print("AFTER: ", result)
print()

# Also test the number: number: pattern
text2 = "35, 35: 35, memory"
pattern2 = r'(\d+)\s*:\s*(\d+)\s*:\s*'
result2 = re.sub(pattern2, r'\1, \2, ', text2)
print("BEFORE:", text2)
print("AFTER: ", result2)
