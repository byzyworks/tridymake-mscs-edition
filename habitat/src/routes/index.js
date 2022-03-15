import express from 'express';

import { vmdl } from '../controllers/vmdl/VMDL.js';

const toVMDL = (op, sys, opts = { }) => {
    let cmd = '';

    if (opts.context) {
        cmd += `@in ${opts.context} `;
    }

    cmd += `@${op} ${sys}`;

    if (opts.define.as) {
        cmd += ` @as ${opts.define.as}`;
    }

    if (opts.define.is) {
        cmd += ` @is ${opts.define.is}`;
    }

    if (opts.define.has) {
        cmd += ` @has ${opts.define.has}`;
    }

    cmd += ';';

    return cmd;
}

export const routes = express.Router();

routes.get('/:context/:sys', (req, res, next) => {
    const opts = {
        context: req.params.context,
        define:  req.query
    };
    const cmd = toVMDL('get', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.get('/:sys', (req, res, next) => {
    const opts = { define: req.query };
    const cmd = toVMDL('get', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.post('/:context/:sys', (req, res, next) => {
    const opts = {
        context: req.params.context,
        define:  req.query
    };
    const cmd = toVMDL('new', req.params.sys, opts);
    
    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.post('/:sys', (req, res, next) => {
    const opts = { define: req.query };
    const cmd = toVMDL('new', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.put('/:context/:sys', (req, res, next) => {
    const opts = {
        context: req.params.context,
        define:  req.query
    };
    const cmd = toVMDL('now', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.put('/:sys', (req, res, next) => {
    const opts = { define: req.query };
    const cmd = toVMDL('now', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.delete('/:context/:sys', (req, res, next) => {
    const opts = {
        context: req.params.context,
        define:  req.query
    };
    const cmd = toVMDL('no', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});

routes.delete('/:sys', (req, res, next) => {
    const opts = { define: req.query };
    const cmd = toVMDL('no', req.params.sys, opts);

    const out = vmdl.parse(cmd, { accept_carry: true });

    res.json(out);
});
