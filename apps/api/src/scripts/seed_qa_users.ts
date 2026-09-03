import bcrypt from 'bcrypt';
import { connectDatabase } from '../config/database.js';
import { User } from '../modules/users/user.model.js';
import { Project } from '../modules/projects/project.model.js';
import { Document } from '../modules/documents/document.model.js';

async function seedQAUsers() {
  console.log('Seeding QA test users...');
  await connectDatabase();

  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 1. Admin User
  let admin = await User.findOne({ email: 'admin@documan.test' });
  if (!admin) {
    admin = await User.create({
      name: 'QA Admin',
      email: 'admin@documan.test',
      passwordHash,
      role: 'admin',
      isActive: true,
      isDeleted: false,
    });
    console.log('Created admin user: admin@documan.test');
  } else {
    admin.passwordHash = passwordHash;
    admin.role = 'admin';
    admin.isActive = true;
    admin.isDeleted = false;
    await admin.save();
    console.log('Updated admin user: admin@documan.test');
  }

  // 2. Standard User
  let standardUser = await User.findOne({ email: 'user@documan.test' });
  if (!standardUser) {
    standardUser = await User.create({
      name: 'QA Standard User',
      email: 'user@documan.test',
      passwordHash,
      role: 'user',
      isActive: true,
      isDeleted: false,
    });
    console.log('Created standard user: user@documan.test');
  } else {
    standardUser.passwordHash = passwordHash;
    standardUser.isActive = true;
    standardUser.isDeleted = false;
    await standardUser.save();
    console.log('Updated standard user: user@documan.test');
  }

  // 3. QA Project & Document
  let project = await Project.findOne({ name: 'Phase 7.5 QA Project' });
  if (!project) {
    project = await Project.create({
      name: 'Phase 7.5 QA Project',
      description: 'Project context for Phase 7.5 Knowledge Risk Radar manual QA',
      ownerId: admin._id,
      governanceSettings: {
        maxUnreviewedDays: 90,
        isGovernanceEnabled: true,
        autoMarkStaleOnUpstreamChange: true,
      },
    });
    console.log('Created QA project');
  }

  const existingDoc = await Document.findOne({ title: 'System Architecture Specification' });
  if (!existingDoc) {
    await Document.create({
      title: 'System Architecture Specification',
      description: 'Core microservices & cloud infrastructure documentation',
      fileName: 'system_arch_spec.pdf',
      filePath: '/tmp/system_arch_spec.pdf',
      fileType: 'application/pdf',
      fileSize: 2048576,
      ownerId: admin._id,
      stewardId: standardUser._id,
      projectId: project._id,
      status: 'APPROVED',
      version: 1,
      lastApprovedVersion: 1,
      lastReviewedAt: new Date(),
    });
    console.log('Created QA document');
  }

  console.log('Seeding finished successfully.');
  process.exit(0);
}

seedQAUsers().catch((err) => {
  console.error('Failed to seed QA users:', err);
  process.exit(1);
});
