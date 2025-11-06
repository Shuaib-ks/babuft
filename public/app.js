// Global state
let currentTreeId = null;
let currentTreeName = null;
let members = [];
let relationships = [];
let editingMemberId = null;

// API base URL
const API_BASE = '/api';

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('create-tree-form').addEventListener('submit', handleCreateTree);
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('member-form').addEventListener('submit', handleSaveMember);
    document.getElementById('relationship-form').addEventListener('submit', handleAddRelationship);
}

// Tab switching
function showTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

function showAppTab(tabName) {
    document.querySelectorAll('.app-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.app-tab-content').forEach(content => content.classList.remove('active'));
    
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    if (tabName === 'tree') {
        renderTreeVisualization();
    }
}

// Create new family tree
async function handleCreateTree(e) {
    e.preventDefault();
    const name = document.getElementById('tree-name').value;
    const passcode = document.getElementById('create-passcode').value;

    try {
        const response = await fetch(`${API_BASE}/trees`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, passcode })
        });

        const data = await response.json();
        
        if (response.ok) {
            currentTreeId = data.id;
            currentTreeName = data.name;
            showAlert('success', `Family tree created! Tree ID: ${data.id}`);
            loadTree(data.id, passcode);
        } else {
            showAlert('error', data.error || 'Failed to create family tree');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Login to existing tree
async function handleLogin(e) {
    e.preventDefault();
    const treeId = document.getElementById('tree-id').value;
    const passcode = document.getElementById('login-passcode').value;

    try {
        const response = await fetch(`${API_BASE}/trees/${treeId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ passcode })
        });

        const data = await response.json();
        
        if (response.ok && data.verified) {
            currentTreeId = parseInt(treeId);
            currentTreeName = data.tree.name;
            loadTree(treeId, passcode);
            showAlert('success', 'Access granted!');
        } else {
            showAlert('error', data.error || 'Invalid passcode');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Load tree data
async function loadTree(treeId, passcode) {
    document.getElementById('auth-section').classList.add('hidden');
    document.getElementById('app-section').classList.remove('hidden');
    document.getElementById('current-tree-name').textContent = currentTreeName;
    document.getElementById('current-tree-id').textContent = treeId;

    await Promise.all([
        loadMembers(),
        loadRelationships()
    ]);
}

// Load members
async function loadMembers() {
    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/members`);
        members = await response.json();
        renderMembers();
        updateMemberSelects();
    } catch (error) {
        showAlert('error', 'Failed to load members');
    }
}

// Render members list
function renderMembers() {
    const container = document.getElementById('members-list');
    
    if (members.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No members yet. Click "Add Member" to get started!</div>';
        return;
    }

    container.innerHTML = members.map(member => `
        <div class="member-card">
            ${member.photo_url ? `<img src="${member.photo_url}" alt="${member.name}" class="member-photo" onerror="this.style.display='none'">` : '<div class="member-photo"></div>'}
            <h3>${escapeHtml(member.name)}</h3>
            <div class="member-info">
                ${member.gender ? `<div>${member.gender}</div>` : ''}
                ${member.birth_date ? `<div>Born: ${formatDate(member.birth_date)}</div>` : ''}
                ${member.death_date ? `<div>Died: ${formatDate(member.death_date)}</div>` : ''}
            </div>
            <div class="member-actions">
                <button class="btn btn-primary" onclick="editMember(${member.id})">Edit</button>
                <button class="btn btn-danger" onclick="deleteMember(${member.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

// Save member
async function handleSaveMember(e) {
    e.preventDefault();
    
    const memberData = {
        name: document.getElementById('member-name').value,
        gender: document.getElementById('member-gender').value,
        birth_date: document.getElementById('member-birth-date').value,
        death_date: document.getElementById('member-death-date').value,
        notes: document.getElementById('member-notes').value,
        photo_url: document.getElementById('member-photo').value
    };

    try {
        const url = editingMemberId 
            ? `${API_BASE}/trees/${currentTreeId}/members/${editingMemberId}`
            : `${API_BASE}/trees/${currentTreeId}/members`;
        
        const method = editingMemberId ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(memberData)
        });

        const data = await response.json();
        
        if (response.ok) {
            closeModal('member-modal');
            await loadMembers();
            showAlert('success', editingMemberId ? 'Member updated!' : 'Member added!');
        } else {
            showAlert('error', data.error || 'Failed to save member');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Delete member
async function deleteMember(memberId) {
    if (!confirm('Are you sure you want to delete this member? All relationships will also be removed.')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/members/${memberId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            await Promise.all([loadMembers(), loadRelationships()]);
            showAlert('success', 'Member deleted');
        } else {
            showAlert('error', data.error || 'Failed to delete member');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Load relationships
async function loadRelationships() {
    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/relationships`);
        relationships = await response.json();
        renderRelationships();
    } catch (error) {
        showAlert('error', 'Failed to load relationships');
    }
}

// Render relationships
function renderRelationships() {
    const container = document.getElementById('relationships-list');
    
    if (relationships.length === 0) {
        container.innerHTML = '<div class="alert alert-info">No relationships yet. Add relationships to connect family members!</div>';
        return;
    }

    container.innerHTML = relationships.map(rel => {
        const person1 = members.find(m => m.id === rel.person1_id);
        const person2 = members.find(m => m.id === rel.person2_id);
        
        if (!person1 || !person2) return '';

        return `
            <div class="relationship-item">
                <div class="relationship-info">
                    <strong>${escapeHtml(person1.name)}</strong>
                    <span class="relationship-type-badge">${rel.relationship_type}</span>
                    <strong>${escapeHtml(person2.name)}</strong>
                </div>
                <button class="btn btn-danger" onclick="deleteRelationship(${rel.id})">Delete</button>
            </div>
        `;
    }).filter(html => html).join('');
}

// Add relationship
async function handleAddRelationship(e) {
    e.preventDefault();
    
    const person1_id = parseInt(document.getElementById('rel-person1').value);
    const person2_id = parseInt(document.getElementById('rel-person2').value);
    const relationship_type = document.getElementById('rel-type').value;

    if (person1_id === person2_id) {
        showAlert('error', 'A person cannot have a relationship with themselves');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/relationships`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ person1_id, person2_id, relationship_type })
        });

        const data = await response.json();
        
        if (response.ok) {
            closeModal('relationship-modal');
            await loadRelationships();
            showAlert('success', 'Relationship added!');
        } else {
            showAlert('error', data.error || 'Failed to add relationship');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Delete relationship
async function deleteRelationship(relId) {
    if (!confirm('Are you sure you want to delete this relationship?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/trees/${currentTreeId}/relationships/${relId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        
        if (response.ok) {
            await loadRelationships();
            showAlert('success', 'Relationship deleted');
        } else {
            showAlert('error', data.error || 'Failed to delete relationship');
        }
    } catch (error) {
        showAlert('error', 'Network error. Please try again.');
    }
}

// Update member selects (for relationships and compare)
function updateMemberSelects() {
    const selects = ['person1-select', 'person2-select'];
    selects.forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.innerHTML = '<option value="">Select a person...</option>' +
                members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
        }
    });
}

// Compare relationship
async function compareRelationship() {
    const person1Id = document.getElementById('person1-select').value;
    const person2Id = document.getElementById('person2-select').value;

    if (!person1Id || !person2Id) {
        showAlert('error', 'Please select both people');
        return;
    }

    if (person1Id === person2Id) {
        showAlert('error', 'Please select two different people');
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/trees/${currentTreeId}/relationship-path?person1_id=${person1Id}&person2_id=${person2Id}`
        );

        const data = await response.json();
        renderRelationshipPath(data.path, person1Id, person2Id);
    } catch (error) {
        showAlert('error', 'Failed to find relationship path');
    }
}

// Render relationship path
function renderRelationshipPath(path, person1Id, person2Id) {
    const container = document.getElementById('relationship-result');
    
    if (!path || path.length === 0) {
        container.innerHTML = '<div class="no-path">No relationship found between these two people.</div>';
        return;
    }

    const person1 = members.find(m => m.id === parseInt(person1Id));
    const person2 = members.find(m => m.id === parseInt(person2Id));

    let html = `
        <div class="relationship-path">
            <h3>Relationship Path</h3>
            <div class="path-step">
                <strong>${escapeHtml(person1.name)}</strong>
            </div>
    `;

    path.forEach(step => {
        html += `
            <div class="path-arrow">↓</div>
            <div class="path-step">
                <span>${step.relationship}</span>
                <strong>${escapeHtml(step.to.name)}</strong>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Render tree visualization
function renderTreeVisualization() {
    const container = document.getElementById('tree-visualization');
    
    if (members.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Add some family members and relationships to see the tree!</div>';
        return;
    }

    // Simple hierarchical tree visualization
    // Group by generations if possible
    const tree = buildTreeStructure();
    container.innerHTML = renderTreeHTML(tree);
}

// Build tree structure
function buildTreeStructure() {
    // Create adjacency list
    const graph = {};
    const memberMap = {};
    
    members.forEach(m => {
        memberMap[m.id] = m;
        graph[m.id] = [];
    });

    relationships.forEach(rel => {
        graph[rel.person1_id].push({
            id: rel.person2_id,
            type: rel.relationship_type
        });
        graph[rel.person2_id].push({
            id: rel.person1_id,
            type: getReverseRelationship(rel.relationship_type)
        });
    });

    // Find root nodes (people with no parents)
    const roots = members.filter(m => {
        return !relationships.some(rel => 
            rel.person2_id === m.id && rel.relationship_type === 'parent'
        );
    });

    if (roots.length === 0 && members.length > 0) {
        roots.push(members[0]); // Use first member as root if no clear root
    }

    return { graph, memberMap, roots };
}

function getReverseRelationship(type) {
    const reverse = {
        'parent': 'child',
        'child': 'parent',
        'spouse': 'spouse',
        'sibling': 'sibling'
    };
    return reverse[type] || type;
}

// Render tree HTML
function renderTreeHTML({ graph, memberMap, roots }) {
    if (roots.length === 0) return '<div class="alert alert-info">No tree structure available</div>';

    let html = '<div class="tree-nodes-container" style="display: flex; flex-direction: column; align-items: center; gap: 30px;">';
    
    // Render each root and their descendants
    roots.forEach(root => {
        html += renderNode(root, graph, memberMap, 0);
    });

    html += '</div>';
    return html;
}

function renderNode(member, graph, memberMap, level) {
    const children = graph[member.id]
        .filter(rel => rel.type === 'child')
        .map(rel => memberMap[rel.id])
        .filter(Boolean);

    let html = '<div class="tree-generation" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; width: 100%;">';
    
    html += `
        <div class="tree-node">
            <h4>${escapeHtml(member.name)}</h4>
            ${member.gender ? `<div class="node-info">${member.gender}</div>` : ''}
            ${member.birth_date ? `<div class="node-info">${formatDate(member.birth_date)}</div>` : ''}
        </div>
    `;

    if (children.length > 0) {
        html += '</div>';
        html += '<div class="tree-generation" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; width: 100%; margin-top: 20px;">';
        children.forEach(child => {
            html += renderNode(child, graph, memberMap, level + 1);
        });
        html += '</div>';
    } else {
        html += '</div>';
    }

    return html;
}

// Utility functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function resetApp() {
    if (confirm('Are you sure you want to log out?')) {
        currentTreeId = null;
        currentTreeName = null;
        members = [];
        relationships = [];
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('app-section').classList.add('hidden');
        document.getElementById('create-tree-form').reset();
        document.getElementById('login-form').reset();
    }
}

function showAlert(type, message) {
    // Remove existing alerts
    const existingAlerts = document.querySelectorAll('.alert');
    existingAlerts.forEach(alert => alert.remove());

    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.textContent = message;
    
    const section = document.getElementById('app-section').classList.contains('hidden') 
        ? document.getElementById('auth-section')
        : document.getElementById('app-section');
    
    section.insertBefore(alert, section.firstChild);
    
    setTimeout(() => alert.remove(), 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// Close modal when clicking outside (works with both mouse and touch)
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
    });
}

// Prevent body scroll when modal is open (mobile-friendly)
document.addEventListener('DOMContentLoaded', () => {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('show', () => {
            document.body.style.overflow = 'hidden';
        });
    });
});

// Close modal on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="block"]');
        openModals.forEach(modal => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        });
    }
});

// Mobile-friendly: Update body overflow when modals open/close
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = '';
}

// Modal functions with body scroll prevention
function showAddMemberModal() {
    editingMemberId = null;
    document.getElementById('member-modal-title').textContent = 'Add Family Member';
    document.getElementById('member-form').reset();
    document.getElementById('member-id').value = '';
    document.getElementById('member-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function editMember(memberId) {
    const member = members.find(m => m.id === memberId);
    if (!member) return;

    editingMemberId = memberId;
    document.getElementById('member-modal-title').textContent = 'Edit Family Member';
    document.getElementById('member-id').value = member.id;
    document.getElementById('member-name').value = member.name || '';
    document.getElementById('member-gender').value = member.gender || '';
    document.getElementById('member-birth-date').value = member.birth_date || '';
    document.getElementById('member-death-date').value = member.death_date || '';
    document.getElementById('member-notes').value = member.notes || '';
    document.getElementById('member-photo').value = member.photo_url || '';
    document.getElementById('member-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function showAddRelationshipModal() {
    if (members.length < 2) {
        showAlert('error', 'You need at least 2 members to create a relationship');
        return;
    }

    const person1Select = document.getElementById('rel-person1');
    const person2Select = document.getElementById('rel-person2');
    
    person1Select.innerHTML = members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    person2Select.innerHTML = members.map(m => `<option value="${m.id}">${escapeHtml(m.name)}</option>`).join('');
    
    document.getElementById('relationship-form').reset();
    document.getElementById('relationship-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
}

