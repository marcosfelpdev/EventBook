const API_BASE_URL = 'http://localhost:3333';

export async function checkApiHealth(): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/health`);

  if (!response.ok) {
    throw new Error('Falha ao comunicar com o servidor.');
  }

  return response.json();
}
