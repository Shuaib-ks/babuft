const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Serve index.html from root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database
const db = new sqlite3.Database('./family_tree.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database tables
function initializeDatabase() {
  db.serialize(() => {
    // Family trees table
    db.run(`CREATE TABLE IF NOT EXISTS family_trees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      passcode_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Family members table
    db.run(`CREATE TABLE IF NOT EXISTS family_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      gender TEXT,
      birth_date TEXT,
      death_date TEXT,
      notes TEXT,
      photo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tree_id) REFERENCES family_trees(id) ON DELETE CASCADE
    )`);

    // Relationships table
    db.run(`CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tree_id INTEGER NOT NULL,
      person1_id INTEGER NOT NULL,
      person2_id INTEGER NOT NULL,
      relationship_type TEXT NOT NULL,
      FOREIGN KEY (tree_id) REFERENCES family_trees(id) ON DELETE CASCADE,
      FOREIGN KEY (person1_id) REFERENCES family_members(id) ON DELETE CASCADE,
      FOREIGN KEY (person2_id) REFERENCES family_members(id) ON DELETE CASCADE,
      UNIQUE(person1_id, person2_id, relationship_type)
    )`);
  });
}

// API Routes

// Create a new family tree
app.post('/api/trees', async (req, res) => {
  const { name, passcode } = req.body;

  if (!name || !passcode) {
    return res.status(400).json({ error: 'Name and passcode are required' });
  }

  try {
    const passcodeHash = await bcrypt.hash(passcode, 10);
    
    db.run(
      'INSERT INTO family_trees (name, passcode_hash) VALUES (?, ?)',
      [name, passcodeHash],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID, name, message: 'Family tree created successfully' });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Error creating family tree' });
  }
});

// Verify passcode and get tree
app.post('/api/trees/:id/verify', async (req, res) => {
  const { id } = req.params;
  const { passcode } = req.body;

  if (!passcode) {
    return res.status(400).json({ error: 'Passcode is required' });
  }

  db.get('SELECT * FROM family_trees WHERE id = ?', [id], async (err, tree) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!tree) {
      return res.status(404).json({ error: 'Family tree not found' });
    }

    const isValid = await bcrypt.compare(passcode, tree.passcode_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid passcode' });
    }

    res.json({ verified: true, tree: { id: tree.id, name: tree.name } });
  });
});

// Get all members of a tree
app.get('/api/trees/:id/members', (req, res) => {
  const { id } = req.params;

  db.all('SELECT * FROM family_members WHERE tree_id = ?', [id], (err, members) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(members);
  });
});

// Add a new member
app.post('/api/trees/:id/members', (req, res) => {
  const { id } = req.params;
  const { name, gender, birth_date, death_date, notes, photo_url } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run(
    'INSERT INTO family_members (tree_id, name, gender, birth_date, death_date, notes, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, gender || null, birth_date || null, death_date || null, notes || null, photo_url || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Member added successfully' });
    }
  );
});

// Update a member
app.put('/api/trees/:treeId/members/:memberId', (req, res) => {
  const { treeId, memberId } = req.params;
  const { name, gender, birth_date, death_date, notes, photo_url } = req.body;

  db.run(
    'UPDATE family_members SET name = ?, gender = ?, birth_date = ?, death_date = ?, notes = ?, photo_url = ? WHERE id = ? AND tree_id = ?',
    [name, gender, birth_date, death_date, notes, photo_url, memberId, treeId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json({ message: 'Member updated successfully' });
    }
  );
});

// Delete a member
app.delete('/api/trees/:treeId/members/:memberId', (req, res) => {
  const { treeId, memberId } = req.params;

  db.run(
    'DELETE FROM family_members WHERE id = ? AND tree_id = ?',
    [memberId, treeId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Member not found' });
      }
      res.json({ message: 'Member deleted successfully' });
    }
  );
});

// Get all relationships for a tree
app.get('/api/trees/:id/relationships', (req, res) => {
  const { id } = req.params;

  db.all('SELECT * FROM relationships WHERE tree_id = ?', [id], (err, relationships) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(relationships);
  });
});

// Add a relationship
app.post('/api/trees/:id/relationships', (req, res) => {
  const { id } = req.params;
  const { person1_id, person2_id, relationship_type } = req.body;

  if (!person1_id || !person2_id || !relationship_type) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (person1_id === person2_id) {
    return res.status(400).json({ error: 'A person cannot have a relationship with themselves' });
  }

  db.run(
    'INSERT INTO relationships (tree_id, person1_id, person2_id, relationship_type) VALUES (?, ?, ?, ?)',
    [id, person1_id, person2_id, relationship_type],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE')) {
          return res.status(400).json({ error: 'Relationship already exists' });
        }
        return res.status(500).json({ error: err.message });
      }
      res.json({ id: this.lastID, message: 'Relationship added successfully' });
    }
  );
});

// Delete a relationship
app.delete('/api/trees/:treeId/relationships/:relId', (req, res) => {
  const { treeId, relId } = req.params;

  db.run(
    'DELETE FROM relationships WHERE id = ? AND tree_id = ?',
    [relId, treeId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Relationship not found' });
      }
      res.json({ message: 'Relationship deleted successfully' });
    }
  );
});

// Get relationship path between two people
app.get('/api/trees/:id/relationship-path', (req, res) => {
  const { id } = req.params;
  const { person1_id, person2_id } = req.query;

  if (!person1_id || !person2_id) {
    return res.status(400).json({ error: 'Both person IDs are required' });
  }

  // Get all relationships and members to build a graph
  db.all('SELECT * FROM relationships WHERE tree_id = ?', [id], (err, relationships) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    db.all('SELECT * FROM family_members WHERE tree_id = ?', [id], (err, members) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Build adjacency list
      const graph = {};
      members.forEach(m => { graph[m.id] = []; });
      relationships.forEach(rel => {
        graph[rel.person1_id].push({ id: rel.person2_id, type: rel.relationship_type });
        graph[rel.person2_id].push({ id: rel.person1_id, type: getReverseRelationship(rel.relationship_type) });
      });

      // BFS to find shortest path
      const path = findRelationshipPath(graph, parseInt(person1_id), parseInt(person2_id), members);
      res.json({ path });
    });
  });
});

// Helper function to get reverse relationship
function getReverseRelationship(type) {
  const reverse = {
    'parent': 'child',
    'child': 'parent',
    'spouse': 'spouse',
    'sibling': 'sibling'
  };
  return reverse[type] || type;
}

// BFS to find relationship path
function findRelationshipPath(graph, startId, endId, members) {
  const queue = [{ id: startId, path: [], visited: new Set([startId]) }];
  const memberMap = {};
  members.forEach(m => { memberMap[m.id] = m; });

  while (queue.length > 0) {
    const current = queue.shift();

    if (current.id === endId) {
      return current.path.map(step => ({
        from: memberMap[step.from],
        to: memberMap[step.to],
        relationship: step.relationship
      }));
    }

    if (graph[current.id]) {
      graph[current.id].forEach(neighbor => {
        if (!current.visited.has(neighbor.id)) {
          const newVisited = new Set(current.visited);
          newVisited.add(neighbor.id);
          queue.push({
            id: neighbor.id,
            path: [...current.path, { from: current.id, to: neighbor.id, relationship: neighbor.type }],
            visited: newVisited
          });
        }
      });
    }
  }

  return null; // No path found
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

