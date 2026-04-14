const trikesService = require('./trikes.service');

const listTrikes = async (req, res) => {
  const trikes = await trikesService.list(req.query);
  return res.json({ data: trikes });
};

const getTrikeById = async (req, res) => {
  const trike = await trikesService.findById(req.params.trikeId);

  if (!trike) {
    return res.status(404).json({ message: 'Trike not found.' });
  }

  return res.json({ data: trike });
};

const createTrike = async (req, res) => {
  const trikeId = await trikesService.create(req.body);
  const trike = await trikesService.findById(trikeId);
  return res.status(201).json({ message: 'Trike created successfully.', data: trike });
};

const updateTrike = async (req, res) => {
  const updated = await trikesService.update(req.params.trikeId, req.body);

  if (!updated) {
    return res.status(404).json({ message: 'Trike not found.' });
  }

  const trike = await trikesService.findById(req.params.trikeId);
  return res.json({ message: 'Trike updated successfully.', data: trike });
};

const deleteTrike = async (req, res) => {
  const deleted = await trikesService.remove(req.params.trikeId);

  if (!deleted) {
    return res.status(404).json({ message: 'Trike not found.' });
  }

  return res.status(204).send();
};

module.exports = {
  listTrikes,
  getTrikeById,
  createTrike,
  updateTrike,
  deleteTrike,
};