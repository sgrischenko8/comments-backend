const express = require("express");
const { addPerson, getPeople } = require("../controllers/personController");

const router = express.Router();

router.post("/", addPerson);
router.get("/", getPeople);

module.exports = router;
