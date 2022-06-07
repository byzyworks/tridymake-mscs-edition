import express from 'express';

const routes = express.Router();

routes.get('/', async (req, res, next) => {
    res.send('Print a list of all available templates.');
});

export default routes;
