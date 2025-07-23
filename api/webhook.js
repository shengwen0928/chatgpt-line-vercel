export default function handler(req, res) {
  if (req.method === 'GET') {
    res.status(200).send('OK');
  } else if (req.method === 'POST') {
    res.status(200).json({ message: 'Received POST' });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}
