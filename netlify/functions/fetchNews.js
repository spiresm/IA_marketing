export async function handler(event) {
  const apiKey = process.env.MEDIASTACK_API_KEY;
  const query = 'intelligence artificielle';
  const url = `http://api.mediastack.com/v1/news?access_key=${apiKey}&languages=fr&keywords=${encodeURIComponent(query)}&limit=50`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Status ${response.status}`);
    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
