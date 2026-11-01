async function run() {
  const res = await fetch('http://localhost:5173/api/chapter?story=moi-ngay-mot-que&chapter=61');
  console.log('Status:', res.status);
  const data = await res.json();
  console.log('Title:', data.title);
  console.log('Content len:', data.content?.length);
  console.log('Snippet:', data.content?.slice(0, 200));
}
run();
