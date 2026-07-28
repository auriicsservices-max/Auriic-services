// Skills Checker Engine & Master Database
// Based on ResumeParser skills_master architecture with 250+ skills & word-boundary matching

export interface SkillDefinition {
  name: string;
  aliases: string[];
}

export interface SkillCategory {
  category: string;
  skills: SkillDefinition[];
}

export interface SkillCheckResult {
  category: string;
  found: string[];
  missing: string[];
}

export interface JDMatchResult {
  score: number; // 0 to 100
  matchingSkills: string[];
  resumeOnlySkills: string[];
  jobOnlySkills: string[];
}

export const SKILLS_MASTER: SkillCategory[] = [
  {
    category: "Programming Languages",
    skills: [
      { name: "Python", aliases: ["python", "python3", "py"] },
      { name: "JavaScript", aliases: ["javascript", "js", "es6", "ecmascript"] },
      { name: "TypeScript", aliases: ["typescript", "ts"] },
      { name: "Java", aliases: ["java", "jdk", "j2ee"] },
      { name: "C++", aliases: ["c++", "cpp"] },
      { name: "C#", aliases: ["c#", "csharp", ".net"] },
      { name: "C", aliases: ["c language", "c programming"] },
      { name: "Go", aliases: ["golang", "go"] },
      { name: "Rust", aliases: ["rust", "rustlang"] },
      { name: "PHP", aliases: ["php", "php7", "php8"] },
      { name: "Ruby", aliases: ["ruby", "rb"] },
      { name: "Swift", aliases: ["swift"] },
      { name: "Kotlin", aliases: ["kotlin"] },
      { name: "Scala", aliases: ["scala"] },
      { name: "R", aliases: ["r programming", "r-lang"] },
      { name: "SQL", aliases: ["sql", "tsql", "plsql"] },
      { name: "HTML5", aliases: ["html", "html5"] },
      { name: "CSS3", aliases: ["css", "css3", "scss", "sass", "less"] },
      { name: "Bash", aliases: ["bash", "shell", "sh", "powershell", "zsh"] },
      { name: "Dart", aliases: ["dart"] },
      { name: "Perl", aliases: ["perl"] },
      { name: "Elixir", aliases: ["elixir"] },
      { name: "Haskell", aliases: ["haskell"] },
      { name: "Assembly", aliases: ["assembly", "nasm", "masm"] },
      { name: "MATLAB", aliases: ["matlab"] }
    ]
  },
  {
    category: "Frameworks & Libraries",
    skills: [
      { name: "React", aliases: ["react", "reactjs", "react.js"] },
      { name: "Next.js", aliases: ["next.js", "nextjs", "next"] },
      { name: "Vue.js", aliases: ["vue", "vuejs", "vue.js"] },
      { name: "Nuxt.js", aliases: ["nuxt", "nuxtjs", "nuxt.js"] },
      { name: "Angular", aliases: ["angular", "angularjs", "angular2+"] },
      { name: "Node.js", aliases: ["node", "nodejs", "node.js"] },
      { name: "Express.js", aliases: ["express", "expressjs", "express.js"] },
      { name: "NestJS", aliases: ["nestjs", "nest.js"] },
      { name: "Django", aliases: ["django", "django rest framework", "drf"] },
      { name: "Flask", aliases: ["flask"] },
      { name: "FastAPI", aliases: ["fastapi"] },
      { name: "Spring Boot", aliases: ["spring", "spring boot", "springboot"] },
      { name: "ASP.NET Core", aliases: ["asp.net", "dotnet core", ".net core"] },
      { name: "Ruby on Rails", aliases: ["rails", "ruby on rails", "ror"] },
      { name: "Laravel", aliases: ["laravel"] },
      { name: "Tailwind CSS", aliases: ["tailwind", "tailwindcss"] },
      { name: "Bootstrap", aliases: ["bootstrap", "bootstrap4", "bootstrap5"] },
      { name: "Redux", aliases: ["redux", "redux toolkit", "rtk"] },
      { name: "GraphQL", aliases: ["graphql", "apollo"] },
      { name: "REST API", aliases: ["rest", "restful", "rest api", "web apis"] },
      { name: "gRPC", aliases: ["grpc"] },
      { name: "jQuery", aliases: ["jquery"] },
      { name: "PyTorch", aliases: ["pytorch"] },
      { name: "TensorFlow", aliases: ["tensorflow", "tf"] },
      { name: "Scikit-Learn", aliases: ["scikit-learn", "sklearn"] },
      { name: "Pandas", aliases: ["pandas"] },
      { name: "NumPy", aliases: ["numpy"] },
      { name: "Flutter", aliases: ["flutter"] },
      { name: "React Native", aliases: ["react native", "react-native"] },
      { name: "Spring", aliases: ["spring framework", "spring mvc"] }
    ]
  },
  {
    category: "Databases & Storage",
    skills: [
      { name: "PostgreSQL", aliases: ["postgres", "postgresql", "pgsql"] },
      { name: "MySQL", aliases: ["mysql"] },
      { name: "MongoDB", aliases: ["mongo", "mongodb"] },
      { name: "Redis", aliases: ["redis"] },
      { name: "Oracle DB", aliases: ["oracle", "oracle db"] },
      { name: "SQL Server", aliases: ["mssql", "sql server", "microsoft sql server"] },
      { name: "SQLite", aliases: ["sqlite"] },
      { name: "Firebase / Firestore", aliases: ["firebase", "firestore"] },
      { name: "DynamoDB", aliases: ["dynamodb"] },
      { name: "Elasticsearch", aliases: ["elasticsearch", "elastic search", "elk"] },
      { name: "Cassandra", aliases: ["cassandra"] },
      { name: "Neo4j", aliases: ["neo4j"] },
      { name: "Supabase", aliases: ["supabase"] },
      { name: "Snowflake", aliases: ["snowflake"] },
      { name: "BigQuery", aliases: ["bigquery"] }
    ]
  },
  {
    category: "Cloud & DevOps",
    skills: [
      { name: "AWS", aliases: ["aws", "amazon web services", "ec2", "s3", "lambda", "rds"] },
      { name: "Google Cloud Platform", aliases: ["gcp", "google cloud", "google cloud platform", "cloud run"] },
      { name: "Microsoft Azure", aliases: ["azure", "microsoft azure"] },
      { name: "Docker", aliases: ["docker", "containerization", "containers"] },
      { name: "Kubernetes", aliases: ["kubernetes", "k8s"] },
      { name: "Terraform", aliases: ["terraform", "iac"] },
      { name: "Ansible", aliases: ["ansible"] },
      { name: "Jenkins", aliases: ["jenkins"] },
      { name: "GitHub Actions", aliases: ["github actions", "gh actions"] },
      { name: "GitLab CI/CD", aliases: ["gitlab ci", "gitlab cicd"] },
      { name: "CI/CD", aliases: ["ci/cd", "cicd", "continuous integration"] },
      { name: "Nginx", aliases: ["nginx"] },
      { name: "Linux", aliases: ["linux", "ubuntu", "debian", "centos", "redhat"] },
      { name: "Prometheus", aliases: ["prometheus"] },
      { name: "Grafana", aliases: ["grafana"] },
      { name: "Kafka", aliases: ["kafka", "apache kafka"] },
      { name: "RabbitMQ", aliases: ["rabbitmq"] }
    ]
  },
  {
    category: "Tools & Software",
    skills: [
      { name: "Git", aliases: ["git", "github", "gitlab", "bitbucket"] },
      { name: "Jira", aliases: ["jira"] },
      { name: "Confluence", aliases: ["confluence"] },
      { name: "Figma", aliases: ["figma"] },
      { name: "Postman", aliases: ["postman"] },
      { name: "Swagger / OpenAPI", aliases: ["swagger", "openapi"] },
      { name: "VS Code", aliases: ["vs code", "vscode", "visual studio code"] },
      { name: "Webpack", aliases: ["webpack"] },
      { name: "Vite", aliases: ["vite", "vitejs"] },
      { name: "npm / yarn / pnpm", aliases: ["npm", "yarn", "pnpm"] },
      { name: "Jest", aliases: ["jest"] },
      { name: "Cypress", aliases: ["cypress"] },
      { name: "Playwright", aliases: ["playwright"] },
      { name: "Selenium", aliases: ["selenium"] },
      { name: "JUnit", aliases: ["junit"] },
      { name: "PyTest", aliases: ["pytest"] }
    ]
  },
  {
    category: "AI, Machine Learning & Data",
    skills: [
      { name: "Machine Learning", aliases: ["machine learning", "ml"] },
      { name: "Deep Learning", aliases: ["deep learning", "dl"] },
      { name: "Artificial Intelligence", aliases: ["ai", "artificial intelligence"] },
      { name: "Natural Language Processing", aliases: ["nlp", "natural language processing"] },
      { name: "Computer Vision", aliases: ["computer vision", "cv"] },
      { name: "Generative AI", aliases: ["generative ai", "genai", "llm", "large language models"] },
      { name: "LangChain", aliases: ["langchain"] },
      { name: "OpenAI API / Gemini", aliases: ["openai", "gemini", "claude", "llm api"] },
      { name: "Data Analysis", aliases: ["data analysis", "data analytics"] },
      { name: "Data Engineering", aliases: ["data engineering", "etl", "data pipeline"] },
      { name: "Apache Spark", aliases: ["spark", "apache spark", "pyspark"] },
      { name: "Tableau", aliases: ["tableau"] },
      { name: "Power BI", aliases: ["power bi", "powerbi"] }
    ]
  },
  {
    category: "Methodologies & Management",
    skills: [
      { name: "Agile / Scrum", aliases: ["agile", "scrum", "kanban"] },
      { name: "Test-Driven Development", aliases: ["tdd", "test driven development"] },
      { name: "Microservices", aliases: ["microservices", "microservice architecture"] },
      { name: "System Architecture", aliases: ["system architecture", "system design"] },
      { name: "Code Review", aliases: ["code review", "peer review"] },
      { name: "Project Management", aliases: ["project management", "pmp"] },
      { name: "Leadership", aliases: ["leadership", "team lead", "mentorship", "management"] },
      { name: "Problem Solving", aliases: ["problem solving", "analytical skills"] },
      { name: "Communication", aliases: ["communication", "presentation skills"] }
    ]
  }
];

// Word boundary skill matcher function using exact \b boundary checks
export function analyzeSkillsFromText(text: string): SkillCheckResult[] {
  const lowerText = text.toLowerCase();
  const results: SkillCheckResult[] = [];

  for (const cat of SKILLS_MASTER) {
    const found: string[] = [];
    const missing: string[] = [];

    for (const skill of cat.skills) {
      let isFound = false;
      for (const alias of skill.aliases) {
        // Escape special characters like +, #, . in alias for regex
        const escaped = alias.replace(/([.*+?^${}()|[\]\/\\])/g, '\\$1');
        // Handle C++, C#, .NET special boundaries
        let regex: RegExp;
        if (alias.includes('+') || alias.includes('#') || alias.startsWith('.')) {
          regex = new RegExp(`(?:^|\\s|\\b|,|\\/)${escaped}(?:$|\\s|\\b|,|\\/)`, 'i');
        } else {
          regex = new RegExp(`\\b${escaped}\\b`, 'i');
        }

        if (regex.test(lowerText)) {
          isFound = true;
          break;
        }
      }

      if (isFound) {
        found.push(skill.name);
      } else {
        missing.push(skill.name);
      }
    }

    results.push({
      category: cat.category,
      found,
      missing
    });
  }

  return results;
}

// Role-specific skill filter
export function analyzeRoleSkills(text: string, targetRole: string): SkillCheckResult[] {
  const lowerRole = targetRole.toLowerCase();
  let allowedCategories: string[] = [];

  if (lowerRole.includes('front') || lowerRole.includes('ui') || lowerRole.includes('web')) {
    allowedCategories = ["Programming Languages", "Frameworks & Libraries", "Tools & Software"];
  } else if (lowerRole.includes('back') || lowerRole.includes('api') || lowerRole.includes('server')) {
    allowedCategories = ["Programming Languages", "Frameworks & Libraries", "Databases & Storage", "Cloud & DevOps"];
  } else if (lowerRole.includes('devops') || lowerRole.includes('cloud') || lowerRole.includes('infra') || lowerRole.includes('site reliability')) {
    allowedCategories = ["Cloud & DevOps", "Databases & Storage", "Tools & Software", "Programming Languages"];
  } else if (lowerRole.includes('data') || lowerRole.includes('ai') || lowerRole.includes('ml') || lowerRole.includes('analyst')) {
    allowedCategories = ["Programming Languages", "AI, Machine Learning & Data", "Databases & Storage"];
  } else {
    // Return all
    return analyzeSkillsFromText(text);
  }

  const allResults = analyzeSkillsFromText(text);
  return allResults.filter(r => allowedCategories.includes(r.category));
}

// Job Description alignment score matcher
export function matchJobDescription(resumeText: string, jobDescriptionText: string): JDMatchResult {
  const jdAnalysis = analyzeSkillsFromText(jobDescriptionText);
  const jdSkills = new Set<string>();

  for (const cat of jdAnalysis) {
    for (const skill of cat.found) {
      jdSkills.add(skill);
    }
  }

  const resumeAnalysis = analyzeSkillsFromText(resumeText);
  const resumeSkills = new Set<string>();

  for (const cat of resumeAnalysis) {
    for (const skill of cat.found) {
      resumeSkills.add(skill);
    }
  }

  const matchingSkills: string[] = [];
  const jobOnlySkills: string[] = [];

  jdSkills.forEach(skill => {
    if (resumeSkills.has(skill)) {
      matchingSkills.push(skill);
    } else {
      jobOnlySkills.push(skill);
    }
  });

  const resumeOnlySkills: string[] = [];
  resumeSkills.forEach(skill => {
    if (!jdSkills.has(skill)) {
      resumeOnlySkills.push(skill);
    }
  });

  const totalJD = jdSkills.size;
  const score = totalJD > 0 ? Math.round((matchingSkills.length / totalJD) * 100) : 100;

  return {
    score,
    matchingSkills,
    resumeOnlySkills,
    jobOnlySkills
  };
}
