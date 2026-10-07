import { db, transaction } from "./db.mjs";
const now = new Date().toISOString();
if (
  !db
    .prepare("SELECT 1 FROM schema_migrations WHERE id=?")
    .get("initial-seed-v1")
)
  transaction(() => {
    const projects = [
      [
        "proj-1",
        "Reviewly",
        "AI Review Generator",
        "QR based review generator for Jaya Dhaba with AI powered review suggestions.",
        "2026-10-04",
        ["user-1", "user-2", "user-3", "user-4"],
      ],
      [
        "proj-2",
        "AR Dish Preview",
        "QR → AR Dish View",
        "Augmented reality dish previews for hospitality menus.",
        "2026-10-12",
        ["user-1", "user-3", "user-4"],
      ],
      [
        "proj-3",
        "DoctorLaptopRepair",
        "Complete Website",
        "Service booking, laptop diagnostics and repair tracking.",
        "2026-10-08",
        ["user-1", "user-2", "user-4"],
      ],
      [
        "proj-4",
        "Lalitha Birthday Website",
        "Personal Website",
        "Interactive celebration website and visual gallery.",
        "2026-10-05",
        ["user-1", "user-3", "user-4"],
      ],
    ];
    for (const [
      id,
      name,
      subtitle,
      description,
      deadline,
      memberIds,
    ] of projects) {
      const data = {
        name,
        subtitle,
        description,
        deadline,
        memberIds,
        ownerId: "user-1",
        progress: 0,
        priority: "MEDIUM",
        category: "Active",
        archived: false,
        notes: "",
      };
      db.prepare("INSERT INTO projects VALUES (?,?,?,?,?,?)").run(
        id,
        JSON.stringify(data),
        now,
        now,
        "user-1",
        "user-1",
      );
      for (const member of memberIds)
        db.prepare("INSERT INTO project_members VALUES (?,?)").run(id, member);
    }
    for (const [id, name, role, initials] of [
      ["team-1", "Harsha", "Owner", "H"],
      ["team-2", "Nihaal", "Content & Web Development", "N"],
      ["team-3", "Lalitha", "Design & Coordination", "L"],
      ["team-4", "Abhilash", "Full Stack & Video Editing", "A"],
    ])
      db.prepare("INSERT INTO team_members VALUES (?,?,?,?,?,?)").run(
        id,
        JSON.stringify({ name, role, initials, sharePercentage: "" }),
        now,
        now,
        "user-1",
        "user-1",
      );
    for (const [id, name, kind] of [
      ["category-1", "Marketing", "expense"],
      ["category-2", "Infrastructure", "expense"],
      ["category-3", "Revenue", "income"],
      ["category-4", "Client work", "project"],
    ])
      db.prepare("INSERT INTO categories VALUES (?,?,?,?,?,?)").run(
        id,
        JSON.stringify({ name, kind }),
        now,
        now,
        "user-1",
        "user-1",
      );
    db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(
      "initial-seed-v1",
      now,
    );
  });
