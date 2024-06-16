const Person = require("../models/Person");

async function addPerson(req, res) {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Name is required" });
    }
    const newPerson = await Person.create({ name });
    res.status(201).json(newPerson);
  } catch (error) {
    console.error("Error creating person:", error);
    res.status(500).json({ error: "Failed to create person" });
  }
}

async function getPeople(req, res) {
  try {
    const people = await Person.findAll();
    res.status(200).json(people);
  } catch (error) {
    console.error("Error fetching people:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
}

module.exports = { addPerson, getPeople };
