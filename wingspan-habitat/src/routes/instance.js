import express from 'express';

const routes = express.Router();

routes.get('/:instance/definition/:machine/:component/:state', async (req, res, next) => {
    res.send('Print the definition of a machine component state.');
});

routes.get('/:instance/definition/:machine/:component', async (req, res, next) => {
    res.send('Print the definition of a machine component.');
});

routes.get('/:instance/definition/:machine', async (req, res, next) => {
    res.send('Print the definition of a machine.');
});

routes.get('/:instance/definition', async (req, res, next) => {
    res.send('Print the instance definition.');
});

routes.get('/:instance/seed', async (req, res, next) => {
    res.send('Print the instance seed.');
});

routes.get('/', async (req, res, next) => {
    res.send('Print a list of all current instance IDs.');
});

routes.post('/:instance/definition/:machine/:component', async (req, res, next) => {
    res.send('Add a new state to a machine component.');
});

routes.post('/:instance/definition/:machine', async (req, res, next) => {
    res.send('Add a new component to a machine.');
});

routes.post('/:instance/definition', async (req, res, next) => {
    res.send('Add a new machine to an instance.');
});

routes.post('/:instance', async (req, res, next) => {
    res.send('Perform an action on the given instance.');
});

routes.post('/', async (req, res, next) => {
    res.send('Create a new instance from a template.');
});

routes.put('/:instance/definition/:machine/:component/:state', async (req, res, next) => {
    res.send('Modify the definition of a machine component state.');
});

routes.put('/:instance/definition/:machine/:component', async (req, res, next) => {
    res.send('Modify the definition of a machine component.');
});

routes.put('/:instance/definition/:machine', async (req, res, next) => {
    res.send('Modify the definition of a machine.');
});

routes.put('/:instance/definition', async (req, res, next) => {
    res.send('Modify the definition of an instance.');
});

routes.put('/:instance/seed', async (req, res, next) => {
    res.send('Modify the seed of an instance.');
});

routes.delete('/:instance/definition/:machine/:component/:state', async (req, res, next) => {
    res.send('Delete a machine component state.');
});

routes.delete('/:instance/definition/:machine/:component', async (req, res, next) => {
    res.send('Delete a machine component.');
});

routes.delete('/:instance/definition/:machine', async (req, res, next) => {
    res.send('Delete a machine.');
});

routes.delete('/:instance', async (req, res, next) => {
    res.send('Delete an instance.');
});

export default routes;
