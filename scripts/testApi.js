import fetch from 'node-fetch';

const API = 'http://localhost:4002';
async function main() {
  const signup = await fetch(`${API}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({name:'Debug',email:`debug${Date.now()}@example.com`,password:'pass123',role:'Client'})
  });
  const user = await signup.json();
  console.log('signup', user);
  const token = user.token;
  const contract = await fetch(`${API}/api/contracts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({fileName:'foo',fileSize:'1 KB',hash:'abc',status:'Pending'})
  });
  const contractData = await contract.json();
  console.log('contract', contractData);
  const analysis = await fetch(`${API}/api/contracts/${contractData.id}/analysis`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({text:'Hello world'})
  });
  const analysisData = await analysis.json();
  console.log('analysis', analysisData);
}
main().catch(console.error);
