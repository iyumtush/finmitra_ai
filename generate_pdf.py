import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.setFont("Helvetica-Bold", 8)
            self.setFillColor(colors.HexColor("#059669"))
            self.drawString(54, 11 * inch - 36, "FINMITRA")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748B"))
            self.drawString(102, 11 * inch - 36, "|   Agentic AI Finance Adviser & Architecture Blueprint")
            
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.75)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Footer (all pages)
        self.setStrokeColor(colors.HexColor("#E2E8F0"))
        self.setLineWidth(0.75)
        self.line(54, 46, 8.5 * inch - 54, 46)

        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        self.drawString(54, 32, "FinMitra Project Context & PPT Blueprint — Confidential")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.restoreState()

def create_pdf(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Palette
    PRIMARY = colors.HexColor("#0F172A")    # Obsidian Navy
    ACCENT = colors.HexColor("#059669")     # Emerald Green
    ACCENT_LIGHT = colors.HexColor("#ECFDF5") # Soft Emerald Tint
    TEXT_DARK = colors.HexColor("#1E293B")   # Slate 800
    TEXT_MUTED = colors.HexColor("#64748B")  # Slate 500
    BG_CARD = colors.HexColor("#F8FAFC")     # Slate 50
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Modify existing styles to avoid conflicts
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        spaceAfter=6
    )
    
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'SectionH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=18,
        textColor=PRIMARY,
        spaceBefore=16,
        spaceAfter=8,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=ACCENT,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9.5,
        leading=13.5,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletDark',
        parent=body_style,
        leftIndent=12,
        firstLineIndent=-8,
        spaceAfter=4
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=9.5,
        leading=14,
        textColor=PRIMARY
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=0
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11.5,
        textColor=TEXT_DARK
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11.5,
        textColor=PRIMARY
    )

    story = []

    # Title Block
    story.append(Paragraph("FinMitra — Project Context & PPT Blueprint", title_style))
    story.append(Paragraph("An Agentic AI Financial Adviser & Personal Wealth Management Platform", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=14))

    # Banner Summary Box
    banner_data = [[
        Paragraph("<b>EXECUTIVE SUMMARY:</b> FinMitra bridges the gap between passive expense trackers and personal wealth advising. By pairing a high-performance Java Spring Boot REST API with a context-aware Agentic AI engine powered by Google Gemini, FinMitra analyzes real-time user cash flow, budget limits, and savings telemetry to deliver actionable, personalized financial advice.", callout_style)
    ]]
    banner_table = Table(banner_data, colWidths=[7.0 * inch])
    banner_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), ACCENT_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, ACCENT),
        ('PADDING', (0, 0), (-1, -1), 10),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(banner_table)
    story.append(Spacer(1, 14))

    # Section 1: Problem Statement & Value Proposition
    story.append(Paragraph("1. The Problem Statement & Industry Gaps", h1_style))
    story.append(Paragraph("Personal finance apps have existed for over a decade, yet young professionals and retail users continue to struggle with debt, impulse spending, and poor wealth accumulation. FinMitra directly addresses four major industry problems:", body_style))
    
    problems = [
        ("Passive Data vs. Actionable Advice", "Traditional apps display static graphs showing where money went ('You spent ₹15,000 on dining out'), but fail to advise users on what to do next."),
        ("Financial Blindspots", "Many individuals track expenses in scattered notes or spreadsheets without understanding their net monthly cash flow or safe spending thresholds."),
        ("Uninformed Loan & EMI Decisions", "Users frequently buy gadgets, cars, or take loans without knowing if their net monthly savings can comfortably absorb the EMI without causing financial distress."),
        ("Generic LLM Limitations", "Standard public AI chatbots lack access to the user's real bank balance and category budgets, leading to generic, ineffective financial responses.")
    ]

    for title, desc in problems:
        story.append(Paragraph(f"• <b>{title}</b>: {desc}", bullet_style))
    
    story.append(Spacer(1, 10))

    # Section 2: What We Are Developing (Core Features)
    story.append(Paragraph("2. What We Are Developing (Core Features)", h1_style))
    
    features_table_data = [
        [Paragraph("Module", table_header_style), Paragraph("Feature Description", table_header_style), Paragraph("Key Capabilities", table_header_style)],
        
        [Paragraph("User Auth & Security", table_cell_bold),
         Paragraph("Stateless JWT authentication system with BCrypt password encryption.", table_cell_style),
         Paragraph("User registration, secure login, bearer token interceptors.", table_cell_style)],
        
        [Paragraph("Transaction Ledger", table_cell_bold),
         Paragraph("Full CRUD expense/income ledger linked to MySQL backend.", table_cell_style),
         Paragraph("Categorization (Rent, Food, Transport, etc.), date sorting, transaction notes.", table_cell_style)],

        [Paragraph("Budget & Alerts System", table_cell_bold),
         Paragraph("Category spending caps with real-time threshold monitoring.", table_cell_style),
         Paragraph("Visual progress bars, over-budget warning badges, remaining cap calculation.", table_cell_style)],

        [Paragraph("Visual Analytics UI", table_cell_bold),
         Paragraph("Interactive financial dashboard built with React 18 & Recharts.", table_cell_style),
         Paragraph("Category Donut charts, Income vs Expense bar comparison, Net Savings KPIs.", table_cell_style)],

        [Paragraph("Mitra AI Adviser", table_cell_bold),
         Paragraph("Context-aware Agentic AI financial engine powered by Google Gemini.", table_cell_style),
         Paragraph("Monthly summary generation, safe EMI calculator, SIP strategy, Q&A chatbot.", table_cell_style)],

        [Paragraph("Dual Theme System", table_cell_bold),
         Paragraph("1-click toggle between Dark Obsidian and Warm Cream Day UI.", table_cell_style),
         Paragraph("Custom CSS design tokens, smooth color palette transition.", table_cell_style)]
    ]

    feat_table = Table(features_table_data, colWidths=[1.4 * inch, 3.1 * inch, 2.5 * inch])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('BACKGROUND', (0, 1), (-1, 1), colors.white),
        ('BACKGROUND', (0, 2), (-1, 2), BG_CARD),
        ('BACKGROUND', (0, 3), (-1, 3), colors.white),
        ('BACKGROUND', (0, 4), (-1, 4), BG_CARD),
        ('BACKGROUND', (0, 5), (-1, 5), colors.white),
        ('BACKGROUND', (0, 6), (-1, 6), BG_CARD),
    ]))
    story.append(feat_table)
    story.append(Spacer(1, 14))

    # Section 3: Tech Stack & Architecture Justification
    story.append(Paragraph("3. Tech Stack & Architectural Justification", h1_style))
    
    tech_data = [
        [Paragraph("Technology", table_header_style), Paragraph("Component Role", table_header_style), Paragraph("Why We Chose It (Rationale)", table_header_style)],
        
        [Paragraph("Java Spring Boot 3.3.2", table_cell_bold), Paragraph("Backend REST API", table_cell_style), Paragraph("Enterprise-grade reliability, high performance, structured layered architecture (Controller, Service, Repository, DTO).", table_cell_style)],
        [Paragraph("MySQL 9.3.0 / Supabase", table_cell_bold), Paragraph("Relational Database", table_cell_style), Paragraph("ACID compliance, strict foreign key constraints (ON DELETE CASCADE), indexed queries for fast financial calculations.", table_cell_style)],
        [Paragraph("Spring Security + JJWT", table_cell_bold), Paragraph("Security & Auth", table_cell_style), Paragraph("Stateless Bearer Token security model. Passwords hashed using BCrypt to satisfy financial data safety standards.", table_cell_style)],
        [Paragraph("Google Gemini 2.5 Flash", table_cell_bold), Paragraph("Agentic AI Engine", table_cell_style), Paragraph("Ultra-low latency, high reasoning accuracy, cost-effective API inference, native support for injected RAG database telemetry.", table_cell_style)],
        [Paragraph("React 18 + Vite 5", table_cell_bold), Paragraph("Frontend Web App", table_cell_style), Paragraph("Lightning-fast HMR dev environment with Vite, component-driven UI architecture with React Hooks & Context API.", table_cell_style)],
        [Paragraph("Recharts & Lucide Icons", table_cell_bold), Paragraph("Data Viz & Graphics", table_cell_style), Paragraph("Lightweight, responsive SVG graphing primitives tailored for financial web applications.", table_cell_style)]
    ]

    tech_table = Table(tech_data, colWidths=[1.5 * inch, 1.8 * inch, 3.7 * inch])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_CARD])
    ]))
    story.append(tech_table)
    story.append(Spacer(1, 14))

    # Section 4: Agentic AI Telemetry Engine Deep-Dive
    story.append(Paragraph("4. Agentic AI & Database Telemetry Engine", h1_style))
    story.append(Paragraph("The core innovation of FinMitra lies in its <b>Live Telemetry Injector</b> implemented in <code>AIServiceImpl.java</code>. Unlike standard chatbots, FinMitra dynamically constructs an in-memory financial profile before querying the AI model:", body_style))
    
    ai_points = [
        ("Real-time Aggregation", "Calculates total income, total expense, net savings, and category distribution directly from MySQL database tables."),
        ("Context Injection", "Generates a structured system prompt containing exact financial metrics: <i>'User: Admin, Income: ₹50,000, Expense: ₹28,000, Net Savings: ₹22,000, Highest Spend Category: Rent (₹12,000)'</i>."),
        ("Safe Loan & EMI Evaluation", "When asked about loans or purchases, the engine evaluates if monthly EMI stays under 35% of net savings: <code>Max Safe EMI = Net Savings × 0.35</code>."),
        ("Wealth Growth Allocation", "Automatically calculates 30% of net savings for SIPs or liquid mutual funds."),
        ("Deterministic Fallback Engine", "If external AI API calls fail or offline, a rules-based fallback engine guarantees 100% operational response uptime.")
    ]

    for title, desc in ai_points:
        story.append(Paragraph(f"• <b>{title}</b>: {desc}", bullet_style))
    
    story.append(Spacer(1, 14))

    # Section 5: 10-Slide PPT Presentation Blueprint
    story.append(PageBreak()) # Clean page break for PPT blueprint section
    story.append(Paragraph("5. 10-Slide PPT Presentation Blueprint", h1_style))
    story.append(Paragraph("Use the following structured outline to quickly populate your project presentation slides:", body_style))
    
    slides = [
        ("Slide 1: Title & Introduction", "Title: FinMitra — An Agentic AI Finance Adviser\nSubtitle: Smart Personal Finance & Wealth Management Platform\nVisual: High-tech dark obsidian mockup with green accent glows."),
        ("Slide 2: Executive Summary", "Headline: Bridging the Gap Between Ledger Logging and Wealth Advice\nKey Message: Full-stack platform combining Java Spring Boot, MySQL, React, and Google Gemini AI telemetry."),
        ("Slide 3: The Problem Statement", "Headline: Why Existing Budget Apps Fail Young Professionals\nKey Points: Data without action, unmonitored impulse spending, risky loan/EMI choices, generic AI chatbots."),
        ("Slide 4: The FinMitra Solution", "Headline: Actionable Financial Intelligence Powered by AI Telemetry\nKey Points: Real-time net cash flow tracking, automated category budget alerts, context-aware AI financial advice."),
        ("Slide 5: System Architecture", "Headline: Enterprise Layered Architecture\nKey Components: React 18 Frontend -> Spring Boot REST API -> Spring Security JWT -> MySQL Database -> Google Gemini API."),
        ("Slide 6: Agentic AI Telemetry Engine", "Headline: How Mitra AI Delivers Personal Advice\nKey Features: In-memory cash flow synthesis, 35% net savings EMI threshold safety rule, 30% SIP wealth allocation engine."),
        ("Slide 7: Tech Stack Matrix", "Headline: Production-Grade Stack Choice & Rationale\nMatrix: Spring Boot (Security & Scale), MySQL (ACID Data Safety), Gemini 2.5 (Fast AI Inference), React+Vite (Modern UX)."),
        ("Slide 8: Key UI & User Experience", "Headline: Designed for Clarity and Engagement\nFeatures: Sleek Dark Obsidian / Warm Cream themes, Recharts visual analytics, interactive chat widget."),
        ("Slide 9: Project Status & Achievements", "Headline: Completed Modules & Validation\nMilestones: ✅ Auth & JWT, ✅ Transaction CRUD, ✅ Category Budgets, ✅ Analytics Dashboard, ✅ Gemini AI Engine."),
        ("Slide 10: Future Roadmap & Vision", "Headline: Scaling FinMitra to Next-Gen Wealth Platform\nVision: Bank SMS Auto-parsing, PDF/CSV Tax Export, Goal Vaults, Multi-currency & Regional Indian Language support.")
    ]

    for title, content in slides:
        slide_card = [
            [Paragraph(f"<b>{title}</b>", ParagraphStyle('SlideHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=9.5, textColor=colors.white))],
            [Paragraph(content.replace('\n', '<br/>'), ParagraphStyle('SlideBody', parent=styles['Normal'], fontName='Helvetica', fontSize=8.5, leading=12, textColor=TEXT_DARK))]
        ]
        t = Table(slide_card, colWidths=[7.0 * inch])
        t.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), PRIMARY),
            ('BACKGROUND', (0, 1), (-1, 1), BG_CARD),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('PADDING', (0, 0), (-1, -1), 6),
        ]))
        story.append(t)
        story.append(Spacer(1, 6))

    story.append(Spacer(1, 10))

    # Section 6: Strategic Future Scope
    story.append(Paragraph("6. Future Scope & Strategic Roadmap", h1_style))
    
    roadmap_items = [
        ("Account Aggregator (AA) Integration", "Automate transaction logging via bank SMS feeds and official Account Aggregator APIs in India."),
        ("PDF & CSV Export Engine", "Allow users to generate audited monthly financial reports, expense breakdowns, and tax summaries using OpenPDF / Apache POI."),
        ("Goal-Based Savings Vaults", "Enable users to create specific financial targets (e.g. Emergency Fund, Vehicle Purchase) with automatic savings allocation."),
        ("Multi-Currency & Regional Localization", "Expand beyond INR (₹) to USD ($) / EUR (€) and add Indian regional languages (Hindi, Marathi, Tamil, Telugu)."),
        ("Mobile Native App", "Extend web application to mobile platforms using React Native with push notifications for budget limit breaches.")
    ]

    for title, desc in roadmap_items:
        story.append(Paragraph(f"• <b>{title}</b>: {desc}", bullet_style))

    # Build PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated PDF at: {output_filename}")

if __name__ == "__main__":
    out_path = "/Users/admin/.gemini/antigravity-ide/scratch/finmitra/FinMitra_Project_Context_and_PPT_Blueprint.pdf"
    create_pdf(out_path)
