namespace AssetManager.Api.Entities;

public enum Role { Admin, User }

public enum AssetCategory { Laptop, Desktop, Monitor, Phone, Tablet, Printer, Network, Peripheral, Other }

public enum AssetStatus { InService, NeedsRepair, UnderMaintenance, Retired }

public enum ActivityAction { Created, Updated, Deleted, Assigned, Unassigned }

public enum TicketPriority { Low, Medium, High }

public enum TicketStatus { Open, InProgress, Resolved, Closed }
