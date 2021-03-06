const { User, Company, Job } = require('../models');
require('dotenv').load();
const SECRET_KEY = process.env.SECRET_KEY;
const jwt = require('jsonwebtoken');

function userAuthHandler(req, res, next) {
    // added data
    return User.findOne({ username: req.body.data.username })
        .then(user => {
            if (!user) return res.status(401).json({
                message: 'Invalid Credentials'
            });
            // added data
            return user.comparePassword(req.body.data.password, (err, isMatch) => {
                if (!isMatch) return res.status(401).json({
                    message: 'Invalid Credentials'
                })
                const token = jwt.sign({ username: user.username }, SECRET_KEY, {
                    expiresIn: 60 * 480
                });
                return res.json({ data: { message: 'Authenticated!', token } });
            })
        })
        .catch(err => next(err));
}

function companyAuthHandler(req, res, next) {
    // added data
    return Company.findOne({ handle: req.body.data.handle })
        .then(company => {
            if (!company) return res.status(401).json({
                message: 'Invalid Credentials'
            });
            // added data
            return company.comparePassword(req.body.data.password, (err, isMatch) => {
                if (!isMatch) return res.status(401).json({
                    message: 'Invalid Credentials'
                })
                // added company._id to the token payload
                const token = jwt.sign({ handle: company.handle, companyId: company._id }, SECRET_KEY, {
                    // 3 days
                    expiresIn: 60 * 60 * 24 * 3
                });
                return res.json({ data: { message: 'Authenticated!', token } });
            })
        })
        .catch(err => next(err));
}

function verifyToken(req, res, next) {
    const queryToken = req.query.token;
    const headerToken = req.headers.authorization && req.headers.authorization.split(' ')[1];
    const token = queryToken || headerToken;
    if (!token) return res.status(401).json({ message: 'No token provided' });
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) res.json({ message: 'Invalid Token' });
        req.decoded = decoded;
        return next();
    })
}

function ensureCorrectUser(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (decoded.username !== req.params.username) return res.status(401).json({ message: "Not Authorized" });
            return next();
        })
    }
    catch (err) {
        return res.status(401).json({ message: "Not Authorized" });
    }
}

function ensureCorrectCompany(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (decoded.handle !== req.params.handle) return res.status(401).json({ message: "Not Authorized" });
            return next();
        })
    }
    catch (err) {
        return res.status(401).json({ message: "Not Authorized" });
    }
}

function ensureIsCompany(req, res, next) {
    try {
        const token = req.headers.authorization.split(' ')[1];
        jwt.verify(token, SECRET_KEY, (err, decoded) => {
            if (err) return next(err);
            if (!decoded.companyId) return res.status(401).json({ message: "Must be a company to post a job" });
            return next();
        })
    }
    catch (err) {
        return res.status(401).json({ message: "Not Authorized" });
    }
}

function ensureCorrectJob(req, res, next) {
    const token = req.headers.authorization.split(' ')[1];
    jwt.verify(token, SECRET_KEY, (err, decoded) => {
        if (err) return next(err);
        Job.findById(req.params.jobId)
            .then(job => {
                if (!decoded.companyId) return res.status(401).json({ message: "Must be a company to post a job" });
                if (decoded.companyId === job.company.toString()) return next();
                return res.status(401).json({ message: "Not Authorized" });
            })
            .catch(err => next(err));
    })
}

module.exports = {
    userAuthHandler,
    companyAuthHandler,
    verifyToken,
    ensureCorrectUser,
    ensureCorrectCompany,
    ensureIsCompany,
    ensureCorrectJob
};