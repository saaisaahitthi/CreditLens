from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT

def generate_pdf():
    doc = SimpleDocTemplate("../docs/sources/Global_Bank_Retail_Credit_Policy.pdf", pagesize=letter)
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = styles['Heading1']
    title_style.alignment = TA_LEFT
    section_style = styles['Heading2']
    body_style = styles['Normal']
    body_style.alignment = TA_JUSTIFY
    body_style.spaceAfter = 12

    story = []

    # Title
    story.append(Paragraph("Global Bank Retail Credit Policy (2025)", title_style))
    story.append(Spacer(1, 12))
    
    story.append(Paragraph("1. Introduction and Scope", section_style))
    story.append(Paragraph(
        "This document outlines the standard retail credit policy for evaluating personal loans and credit lines. "
        "The purpose of this policy is to ensure responsible lending practices while maintaining the bank's risk appetite. "
        "All applications must be scored using the approved internal Machine Learning models, and human analysts must "
        "review high-risk accounts referencing these guidelines.", body_style))
    
    story.append(Paragraph("2. Debt-to-Income (DTI) Ratio", section_style))
    story.append(Paragraph(
        "The Debt-to-Income (DebtRatio) is calculated as total monthly debt payments divided by gross monthly income. "
        "A DTI ratio above 40% (0.40) generally requires secondary review. A DTI ratio exceeding 50% (0.50) is considered "
        "high risk and normally results in automatic decline, unless mitigating factors such as significant liquid reserves are present.", body_style))
    
    story.append(Paragraph("3. Revolving Utilization of Unsecured Lines", section_style))
    story.append(Paragraph(
        "Revolving utilization is the total balance on unsecured credit lines divided by the total credit limit. "
        "Utilization above 30% begins to negatively impact credit scores. Utilization exceeding 80% (0.80) is a strong indicator "
        "of financial distress. Accounts with > 100% (1.0) utilization are in strict violation of policy and are classified as critical risk.", body_style))
    
    story.append(Paragraph("4. Delinquency and Past Due Behavior", section_style))
    story.append(Paragraph(
        "Historical payment behavior is the strongest predictor of future default. "
        "Any instance of being 90 Days Late (NumberOfTimes90DaysLate > 0) within the last 24 months flags the account for immediate review. "
        "Multiple instances of 30-59 or 60-89 days past due (CombinedPastDue) also indicate cash flow problems. "
        "Under current guidelines, an applicant with more than 3 combined derogatory marks should not be approved for unsecured credit.", body_style))
    
    story.append(Paragraph("5. Income and Dependents", section_style))
    story.append(Paragraph(
        "When assessing Monthly Income, analysts must consider the Number of Dependents. "
        "The disposable income per dependent (IncomePerDependent) is used to estimate true repayment capacity. "
        "Extremely low declared monthly income (e.g., less than $1,500 for a family of 4) must trigger manual verification.", body_style))
    
    story.append(Paragraph("6. Age and Demographics", section_style))
    story.append(Paragraph(
        "The bank does not discriminate based on age. However, credit scoring models may capture length of credit history "
        "which often correlates with age. Younger applicants may require alternative data evaluation. "
        "Applicants under 18 cannot enter legally binding credit agreements.", body_style))
        
    doc.build(story)

if __name__ == "__main__":
    generate_pdf()
