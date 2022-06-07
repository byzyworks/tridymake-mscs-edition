import express from 'express';

import templates from './template.js';
import instances from './instance.js';

const routes = express.Router();

routes.use('/template', templates);
routes.use('/instance', instances);
//routes.use('/user', users);
//routes.use('/service', services);
//routes.use('/acl', acls);

export default routes;
