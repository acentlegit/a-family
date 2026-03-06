
export async function httpAdapter(endpoint: string, payload: any) {
  const res = await fetch(endpoint, {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" }
  });
  return res.json();
}
