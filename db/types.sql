CREATE TYPE [dbo].[udt_Certificate] AS TABLE (

    [CertificateName] varchar(200)
);
GO

CREATE TYPE [dbo].[udt_ContactDetails] AS TABLE (

    [ClientContactsID] bigint
);
GO

CREATE TYPE [dbo].[udt_CourseDegree] AS TABLE (

    [DegreeID] int,
    [CoureID] int
);
GO

CREATE TYPE [dbo].[udt_Education] AS TABLE (

    [DegreeID] int
);
GO

CREATE TYPE [dbo].[udt_Employers] AS TABLE (

    [EmployerName] varchar(200),
    [StartDt] date,
    [EndDate] date,
    [DesignationID] int,
    [Responsibilities] varchar(5000),
    [flgCurrent] tinyint
);
GO

CREATE TYPE [dbo].[udt_exp] AS TABLE (

    [MinExp] int,
    [MaxExp] int
);
GO

CREATE TYPE [dbo].[udt_Gender] AS TABLE (

    [gender] char(1)
);
GO

CREATE TYPE [dbo].[udt_JobInterview] AS TABLE (

    [JobSubscriberMapID] bigint,
    [JobMapStatusID] int,
    [InterviewTime] datetime,
    [InterviewModeID] int
);
GO

CREATE TYPE [dbo].[udt_keyPair] AS TABLE (

    [id] bigint,
    [strValue] varchar(500)
);
GO

CREATE TYPE [dbo].[udt_MultipleBIGINTIds] AS TABLE (

    [id] bigint
);
GO

