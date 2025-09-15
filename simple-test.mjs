// Simple semantic search test
async function test() {
  try {
    const response = await fetch('http://localhost:5173/api/semantic-search?q=contract%20dispute&limit=5&threshold=0.3');
    console.log('Status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
  } catch (error) {
    console.error('Error:', error);
  }
}
test();
