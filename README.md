# 🌳 Family Tree Builder

A beautiful, mobile-friendly web application for creating and sharing family trees with passcode protection.

## Features

- ✅ **Create Family Trees** - Set up your family tree with a name and secure passcode
- ✅ **Add Family Members** - Add members with details like name, gender, birth date, notes, and photos
- ✅ **Manage Relationships** - Connect family members with relationships (parent, child, spouse, sibling)
- ✅ **Visual Family Tree** - View your family tree in a hierarchical layout
- ✅ **Relationship Finder** - Compare relationships between any two family members
- ✅ **Passcode Protection** - Secure access with passcodes to protect privacy
- ✅ **Database Storage** - All data is stored persistently in SQLite database
- ✅ **Mobile Friendly** - Fully responsive design that works on all devices

## Installation

### Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

### Setup Steps

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```

3. **Access the application:**
   Open your browser and navigate to `http://localhost:3000`

## Usage

### Creating a Family Tree

1. Click on "Create New Tree" tab
2. Enter a name for your family tree
3. Set a secure passcode (share this with family members)
4. Click "Create Family Tree"
5. You'll receive a Tree ID - save this to share with family

### Accessing an Existing Tree

1. Click on "Access Existing Tree" tab
2. Enter the Tree ID and passcode
3. Click "Access Tree"

### Adding Family Members

1. Click "Members" tab
2. Click "+ Add Member"
3. Fill in member details (name is required)
4. Click "Save"

### Creating Relationships

1. Click "Relationships" tab
2. Click "+ Add Relationship"
3. Select two people and the relationship type
4. Click "Add Relationship"

### Viewing Family Tree

1. Click "Family Tree" tab
2. View your family tree in a hierarchical layout

### Comparing Relationships

1. Click "Compare" tab
2. Select two family members
3. Click "Find Relationship"
4. View the relationship path between them

## Technical Details

### Backend

- **Framework:** Express.js
- **Database:** SQLite3
- **Authentication:** bcryptjs for passcode hashing
- **Port:** 3000 (default)

### Frontend

- **Vanilla JavaScript** - No frameworks required
- **Modern CSS** - Responsive design with CSS Grid and Flexbox
- **Mobile First** - Optimized for all screen sizes

### Database Schema

- `family_trees` - Stores tree information and passcode hashes
- `family_members` - Stores individual family member data
- `relationships` - Stores connections between family members

## API Endpoints

- `POST /api/trees` - Create new family tree
- `POST /api/trees/:id/verify` - Verify passcode
- `GET /api/trees/:id/members` - Get all members
- `POST /api/trees/:id/members` - Add member
- `PUT /api/trees/:treeId/members/:memberId` - Update member
- `DELETE /api/trees/:treeId/members/:memberId` - Delete member
- `GET /api/trees/:id/relationships` - Get all relationships
- `POST /api/trees/:id/relationships` - Add relationship
- `DELETE /api/trees/:treeId/relationships/:relId` - Delete relationship
- `GET /api/trees/:id/relationship-path` - Find relationship path

## Security

- Passcodes are hashed using bcryptjs before storage
- SQL injection protection through parameterized queries
- CORS enabled for API access

## Notes

- The database file (`family_tree.db`) will be created automatically on first run
- All data is stored locally in the SQLite database
- Photos can be added via URL (host images externally)

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

