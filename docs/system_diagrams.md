# Multi-Branch Inventory Management System Diagrams

Based on the system's current database models and backend structure, here are the diagrams requested: an Entity-Relationship Diagram (ERD), a Use Case Diagram, and a systematic Flowchart representing the core logic of the system.

## 1. Entity-Relationship Diagram (ERD)

This ERD maps out the relationships between the database tables (Models) defined in the Django backend. The core entities include User Profiles, Branches, Suppliers, Products, and the tracking of Stocks and their Movements.

```mermaid
erDiagram
    User {
        int id PK
        string username
        string email
        string password
    }
    Profile {
        int id PK
        int user_id FK
        string role "ADMIN / STAFF"
        int branch_id FK
    }
    Branch {
        int id PK
        string name
        string location
    }
    Supplier {
        int id PK
        string name
        string contact_person
        string email
        string phone
        string address
    }
    Product {
        int id PK
        string name
        string description
        string sku
        decimal price
        int supplier_id FK
    }
    Stock {
        int id PK
        int branch_id FK
        int product_id FK
        int quantity
        int low_stock_threshold
    }
    StockTransfer {
        int id PK
        int product_id FK
        int from_branch_id FK
        int to_branch_id FK
        int quantity
        string status "PENDING/COMPLETED/CANCELLED"
        int created_by_id FK
        datetime created_at
    }
    StockMovementHistory {
        int id PK
        int branch_id FK
        int product_id FK
        string movement_type "IN/OUT/TRANSFER/SALE"
        int quantity
        string reference
        int performed_by_id FK
        datetime date
    }

    %% Relationships
    User ||--|| Profile : has
    Profile }o--o| Branch : assigned_to
    Supplier ||--o{ Product : supplies
    Branch ||--o{ Stock : physically_holds
    Product ||--o{ Stock : stored_as
    Branch ||--o{ StockTransfer : sends_stock
    Branch ||--o{ StockTransfer : receives_stock
    Product ||--o{ StockTransfer : involves
    User ||--o{ StockTransfer : initiates
    Branch ||--o{ StockMovementHistory : tracks_history_for
    Product ||--o{ StockMovementHistory : records_for
    User ||--o{ StockMovementHistory : performs
```

---

## 2. Use Case Diagram

This Use Case diagram highlights the different interactions the actors (`Global Admin` and `Branch Staff`) can have with the inventory system.

```mermaid
flowchart LR
    %% Actors
    Admin(["Global Admin"])
    Staff(["Branch Staff"])
    
    %% System Boundary
    subgraph "System Boundary: Multi-Branch Inventory Management System"
        direction TB
        UC1([Manage Branches and Suppliers])
        UC2([Manage Global Products Catalog])
        UC3([Manage Users & Profiles])
        UC4([View All Branch Stocks & Alerts])
        UC5([Manage Specific Branch Stock In/Out])
        UC6([Initiate Stock Transfer locally])
        UC7([Approve & Complete Stock Transfers])
        UC8([Record Local Sales & Deductions])
        UC9([View Stock Movement History])
    end
    
    %% Admin Associations
    Admin --> UC1
    Admin --> UC2
    Admin --> UC3
    Admin --> UC4
    Admin --> UC7
    Admin --> UC9
    
    %% Staff Associations
    Staff --> UC5
    Staff --> UC6
    Staff --> UC8
    Staff --> UC9
    
    %% Styling
    classDef usecase fill:#f9f9f9,stroke:#333,stroke-width:2px;
    class UC1,UC2,UC3,UC4,UC5,UC6,UC7,UC8,UC9 usecase;
```

---

## 3. System Process Flowchart

This flowchart demonstrates the central process path for a user logging into the system, and navigating either through Branch Staff workflows (like recording a sale or requesting a stock transfer) or Global Admin workflows (approving transfers and managing global entities).

```mermaid
flowchart TD
    Start([Start]) --> Login(User Logs In)
    Login --> RoleCheck{Check User Role}
    
    %% Roles Diversion
    RoleCheck -- Global Admin --> AdminDash[Admin Dashboard]
    RoleCheck -- Branch Staff --> StaffDash[Branch Staff Dashboard]
    
    %% --- STAFF FLOW ---
    StaffDash --> ViewStock[View Local Branch Stock]
    ViewStock --> ActionChoice{Select Action}
    
    ActionChoice -- Record Sale / Modify Stock --> UpdateStock[Record IN/OUT/SALE]
    UpdateStock --> RecHistory[Log in Stock Movement History]
    RecHistory --> DB2[(Database Updated)]
    
    ActionChoice -- Request Transfer --> CreateTransfer[Create Stock Transfer Request]
    CreateTransfer --> DB1[(Saved as PENDING in DB)]
    
    %% --- ADMIN FLOW ---
    AdminDash --> AdminActionChoice{Select Action}
    
    AdminActionChoice -- Manage System Entities --> ManageEntities[Manage Suppliers / Products / Branches / Users]
    ManageEntities --> DB_GLOBAL[(Database Updated)]
    
    AdminActionChoice -- View Pending Transfers --> ViewTransfers[Review Transfer Request]
    DB1 -.-> ViewTransfers
    
    ViewTransfers --> ApproveTrans{Approve Transfer?}
    
    ApproveTrans -- Yes --> CompleteTransfer[Set Status to COMPLETED]
    CompleteTransfer --> DeductSrc[Deduct Stock from Source Branch]
    DeductSrc --> AddDest[Add Stock to Destination Branch]
    AddDest --> RecTransHistory[Record TRANSFER in Movement History]
    RecTransHistory --> DB3[(Database Updated)]
    
    ApproveTrans -- No --> CancelTransfer[Set Status to CANCELLED]
    CancelTransfer --> DB4[(Transfer Cancelled in DB)]
    
    %% End States
    DB2 --> End([Finish Workflow])
    DB_GLOBAL --> End
    DB3 --> End
    DB4 --> End

    %% Styles
    classDef conditional fill:#ffdfba,stroke:#f2a65a,stroke-width:2px
    classDef database fill:#bae1ff,stroke:#5fa8d3,stroke-width:2px
    classDef startend fill:#baffc9,stroke:#74c69d,stroke-width:2px
    
    class RoleCheck,ActionChoice,AdminActionChoice,ApproveTrans conditional;
    class DB1,DB2,DB3,DB4,DB_GLOBAL database;
    class Start,End startend;
```

---

## 4. Swimlane Diagram

This swimlane diagram separates the system process into lanes for the User, Branch Staff, Global Admin, and the System/Database. It highlights how transfer requests and stock updates flow between the actors and the backend.

```mermaid
flowchart TB
    %% Swimlane-style process for the Multi-Branch Inventory Management System
    subgraph U[User]
        direction TB
        U1[Login & Select Branch]
        U2[Choose Action]
    end

    subgraph S[Branch Staff]
        direction TB
        BS1[View Local Stock]
        BS2[Create Transfer Request]
        BS3[Record Sale / Adjust Stock]
    end

    subgraph A[Global Admin]
        direction TB
        GA1[Review Pending Transfers]
        GA2[Approve or Cancel Transfer]
        GA3[Manage Products / Suppliers / Branches / Users]
    end

    subgraph D[System / Database]
        direction TB
        DB1[(Pending Transfer Request)]
        DB2[(Stock Movement History)]
        DB3[(Updated Branch Stock)]
    end

    U1 --> U2
    U2 --> BS1
    BS1 --> U2

    U2 -- "Request Transfer" --> BS2
    BS2 --> DB1
    DB1 --> GA1

    U2 -- "Record Sale / Stock Adjustment" --> BS3
    BS3 --> DB2

    GA1 --> GA2
    GA2 -- "Approve" --> GA3
    GA3 --> DB3
    GA3 --> DB2

    GA2 -- "Cancel" --> DB1

    classDef lane fill:#f0f8ff,stroke:#0f4c75,stroke-width:1px;
    class U,S,A,D lane;
    classDef database fill:#d6e7ff,stroke:#19647e,stroke-width:2px;
    class DB1,DB2,DB3 database;
```
```
