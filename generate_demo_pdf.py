import sys
import subprocess

try:
    from fpdf import FPDF
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fpdf2"])
    from fpdf import FPDF

class PDF(FPDF):
    def header(self):
        self.set_font("helvetica", "B", 16)
        self.cell(0, 10, "System Demo & Action Plan Script", border=False, align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("helvetica", "I", 8)
        self.cell(0, 10, f"Page {self.page_no()}", border=False, align="C")

pdf = PDF()
pdf.add_page()
pdf.set_font("helvetica", size=12)

content = """
Introduction to the Demo
------------------------
"Good day panel. We will now proceed with the live demonstration of the Multi-Branch Inventory Management System. For this demo, I will act as the System Administrator to show you the core functionalities, from managing branches to handling stock transfers."

Step 1: Admin Login & Dashboard
-------------------------------
Action: Open the login page and enter the admin credentials.
Script: "First, we log into the system as an administrator. Once successfully logged in, we are greeted by the main dashboard. Here, we can see a quick overview of our entire operation: the total number of branches, the total active products, and any immediate alerts like low stock warnings across all branches."

Step 2: Managing Branches
-------------------------
Action: Navigate to the Branches section and add a new branch.
Script: "Let's start by managing our branches. In this section, the admin can view all registered branches. If our business expands, we can easily add a new branch here. I will now create a branch named 'Downtown Branch'. As you can see, it is immediately added to our system and is ready to hold inventory."

Step 3: Managing Products & Inventory
-------------------------------------
Action: Go to the Products section and add a new product. Then assign stock to a branch.
Script: "Next, let's look at the Products section. Here we maintain our master list of items. I will add a new product, for example, 'Wireless Headphones'. 
After creating the product, we can assign specific stock quantities to our different branches. Let's assign 50 units to the Main Branch and 20 units to the new Downtown Branch. Each branch now tracks its own stock independently."

Step 4: Stock Transfers Between Branches
----------------------------------------
Action: Navigate to Stock Transfers. Initiate a transfer from Main Branch to Downtown Branch.
Script: "A key feature of our system is handling inter-branch stock transfers. Suppose the Downtown Branch is running low on Wireless Headphones. I will initiate a transfer of 10 units from the Main Branch to the Downtown Branch. 
Once approved, the system automatically deducts 10 units from the Main Branch and adds them to the Downtown Branch, keeping our records perfectly accurate in real-time."

Step 5: Sales and Automatic Deduction
-------------------------------------
Action: Simulate a sale or stock deduction at a specific branch.
Script: "Now, let's simulate a transaction. When a branch makes a sale, the inventory must reflect this. I will record a sale of 5 units of Headphones at the Downtown Branch. You will notice that the stock level for this branch immediately updates from 30 down to 25 units. This ensures we never sell products we don't have."

Step 6: Low Stock Alerts
------------------------
Action: Show a product whose stock has dropped below the minimum threshold.
Script: "To prevent stockouts, our system features automated Low Stock Alerts. If a branch's inventory drops below a designated threshold - let's say 10 units - the system immediately flags it. As you can see here on the dashboard, we have an alert notifying us that we need to restock this specific item at this specific branch."

Step 7: History and Logs
------------------------
Action: Open the Transfer Logs or Stock History page.
Script: "Finally, for transparency and auditing, the system maintains a comprehensive log of all movements. In the History section, we can track every stock transfer, who initiated it, and when it happened. This ensures complete accountability across all our branches."

Conclusion
----------
"This concludes the core demonstration of our system. As shown, the application efficiently centralizes the management of multiple branches, automates stock tracking, and provides real-time visibility to administrators. Thank you."
"""

pdf.multi_cell(0, 7, text=content)
pdf.output("System_Demo_Action_Plan.pdf")
print("PDF created successfully: System_Demo_Action_Plan.pdf")
