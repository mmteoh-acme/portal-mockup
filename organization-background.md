# Organization background

Background for the redesign of the account group, user group, role and permission set hierarchy.

* This document records the client's organization, the proposed hierarchy, and the six teams that will be modelled as Roles.
* It is background only. No code in this repo has changed to match it.
* Related tickets are ACME-2177 (flat accounts and grouping) and ACME-2178 (RBAC catalogue, presets, account group scoping).

## Who is who

* Acme is the platform. Acme defines the permission catalogue and the permission sets.
* Ripple is the client. Ripple holds multiple legal entities under one company.
* The client group is the top layer. Accounts sit flat under it, per ACME-2177.

## Hierarchy

```mermaid
graph TD
    C["<b>Company</b><br/>Ripple"]
    G["<b>Group</b><br/>e.g. RMA Signers<br/>defines account access"]
    R["<b>Role</b><br/>e.g. Finance and Treasury<br/>client-customizable"]
    PS["<b>Permission Set</b><br/>e.g. Finance<br/>managed by Acme"]
    P1["<b>Permission</b><br/>Transactions"]
    P2["<b>Permission</b><br/>Payment Approvals"]
    A["<b>Accounts</b><br/>attributes: legal entity, bank, currency"]
    U["<b>Users</b><br/>assigned to one or more Groups"]

    C --> G
    G --> R
    R --> PS
    PS --> P1
    PS --> P2
    G --> A
    G --> U
```

The same shape without mermaid:

```
Company (Ripple)
└── Group  ......................  defines account access, grants roles, holds users
    ├── Role  ..................  narrows the permission sets. Client-customizable
    │   └── Permission Set  ....  managed by Acme
    │       └── Permission  ....  managed by Acme
    ├── Accounts in scope  .....  all, by legal entity, or hand-picked
    └── Users  .................  a user can be in several groups
```

Reading the chart:

* A **Group** defines account access. It grants one or more Roles and holds Users.
* A **Role** narrows the permission sets. Each organization works differently, so roles are the customizable layer.
* A **Permission Set** and its **Permissions** are managed by Acme. Clients do not author them.
* **Accounts** are described by attributes, not by position in a tree. The attributes are legal entity, bank and currency.
* A **User** is assigned to one or more Groups, and holds no permission of their own.

There is no account-group layer. A group scopes onto accounts directly.

## Legal entities

Ripple holds four legal entities. The names and codes below are recorded exactly as supplied. See the open questions for two that need confirming.

| Legal entity | Code |
| --- | --- |
| Ripple Markets APAC | RMA |
| Ripple Labs Cayman | RLKY |
| Ripple Markets Delaware | RMDE |
| Ripple Markets Middle East | RMEA |

The codes are the R-prefixed set. They come from the group definitions below, which name RMA and RLKY accounts, and they match ACME-2177. This supersedes the earlier AMA / AL / AMDE / AMEL list.

## The configuration

### Groups

A group defines account access, grants roles and holds users.

| Group | Role | Accounts in scope |
| --- | --- | --- |
| Administrators | Administrator | All |
| Trading and Markets | Operations | All |
| Engineers | Engineering | All |
| RMA Signers | Finance and Treasury | RMA accounts |
| RLKY Signers | Finance and Treasury | RLKY accounts |

The two Signers groups are the same role over different account scopes. That is how one person signs for one entity and not another.

### Roles

A role narrows the permission sets for how this organization works. Roles are customizable per client.

| Role | Permission sets |
| --- | --- |
| Administrator | Administrator |
| Engineering | Engineer |
| Operations | Payments |
| Reconciliation | Recon Operations |
| Customer Support | Reviewer |
| Finance and Treasury | Finance |

### Permission sets and permissions

Managed by Acme.

| Permission set | Permissions |
| --- | --- |
| Administrator | All |
| Recon Operations | Transactions |
| Payments | Transactions, Payment Orders |
| Finance | Transactions, Payment Approvals |
| Reviewer | Payment Orders Edit |
| Engineer | Not yet specified |

### Users

A user is assigned to one or more groups. Account access and permissions both follow from that.

| User | Groups |
| --- | --- |
| Jx | Administrators, RMA Signers, RLKY Signers |
| Ming | Administrators |
| Nigel | RMA Signers |
| Cayter | Engineers |
| Benoit | Trading and Markets |

Jx is in both Signers groups, so Jx can sign for RMA and for RLKY. Nigel can sign for RMA only.

## Team functions

Background on the teams the roles are named after.

### Trading and Markets (RTM team)

* Supports all internal FIAT operations automation, including trading pay-ins and payouts with external trading counterparties.
* Operations are time-sensitive.
* Payment volume is low. Payment values are high.
* Sole user of the maker-checker feature.
* Phased out H2H after migrating all their functions by integrating the Acme maker-checker key into their internal portal.
* One user holding the payment-checker role in one group can hold payment-maker in another group.

### Trading and Markets Recon team

* Sub-team of the above.
* Consumes transaction, balance and payment-read data only, for analysis and reconciliation.
* Data quality is the priority. The data must be accurate against the bank raw data.

### Payment Ops team

* Supported by the internal dashboard built by the Trading and Markets team.
* Has historically handled payment ops functions such as making payments from the bank portal and reconciling payment status.
* Time-sensitive.
* Should have visibility of all accounts of a given legal entity.
* Can be maker or checker for different accounts.

### Ripple Treasury team

* Runs a treasury management system. Ripple acquired GTreasury in 2025 and uses GTreasury for the treasury function.
* Ledger reconciliation, at daily close and at month end.

### FIAT and Zeus team

* Owns the FIAT function.
* Previously integrated Acme into Trovata. Ripple is now sunsetting the Trovata connection.
* Makes payments from all accounts.

### Payment Product team

* Works on Ripple core product features such as Ripple Pay.
* In discussion on a virtual account API for an MXN bank.
* May need access to API key management, webhook retriggering, and cross-checking the API response against what Acme presents.

## What the mockup reflects

Deployed: <https://portal-mockup-virid.vercel.app>

* The landing page is Transactions. The home page is removed for MVP.
* The account groups page is removed. A group scopes onto accounts directly.
* User Management carries the four tabs: Groups, Roles, Permission Sets, Users.
* The five groups, six roles, six permission sets and five users above are the seeded data.

## Open questions

* The **Engineer** permission set is named by the Engineering role but its permissions were never listed. It is seeded empty rather than guessed. What does an engineer get? Candidates are API keys, webhooks and request logs, all of which ACME-2178 currently defers and hard-codes to administrator.
* The **Engineers** group is not in the group list, but Cayter is assigned to it. It has been added with the Engineering role and all-account scope. Confirm the scope.
* **Reconciliation** and **Customer Support** roles exist but no group grants them, so nobody holds them. Confirm whether groups for those teams are coming.
* **Payment Orders Edit** is the only permission in the Reviewer set. Confirm that Customer Support edits payment orders without being able to view transactions.
* The brief opened with "Acme group has multiple legal entities" while every entity is a Ripple entity. Read as Ripple being the client and Acme the platform. Confirm.
* **Administrator holds All**, which includes Payment Approvals. ACME-2178 states that an administrator configures who approves and does not approve. Those two statements conflict. Confirm which holds.
