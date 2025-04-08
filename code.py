import fitz  # PyMuPDF
from transformers import pipeline

# Step 1: Extract text from PDF
def extract_text_from_pdf(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

# Step 2: Summarize text using a pre-trained model
def summarize_text(text, max_len=1300):
    summarizer = pipeline("summarization", model="facebook/bart-large-cnn")
    # Truncate to meet token limit of model (~1024 tokens = ~1300 words)
    if len(text.split()) > max_len:
        text = " ".join(text.split()[:max_len])
    summary = summarizer(text, max_length=300, min_length=50, do_sample=False)
    return summary[0]['summary_text']

# Step 3: Interactive chatbot
def chatbot():
    print("📄 Welcome to the Research Paper Summarizer Bot!")
    pdf_path = input("Enter the path to the research paper PDF: ").strip()
    
    print("\n🔍 Extracting and analyzing the document...")
    full_text = extract_text_from_pdf(pdf_path)
    
    while True:
        print("\n🤖 How can I help you?")
        print("1. Get a full paper summary")
        print("2. Ask a specific question (e.g., methods, findings)")
        print("3. Exit")
        choice = input("Choose an option: ")

        if choice == "1":
            print("\n📚 Summary:")
            summary = summarize_text(full_text)
            print(summary)

        elif choice == "2":
            question = input("Enter your question (you can ask about findings, conclusion, etc.): ")
            print("🔎 Searching the text for relevant content...")
            # Naive approach: keyword search (can be improved with QA models)
            if "method" in question.lower():
                section = extract_section(full_text, "method")
            elif "result" in question.lower() or "finding" in question.lower():
                section = extract_section(full_text, "result")
            elif "conclusion" in question.lower():
                section = extract_section(full_text, "conclusion")
            else:
                section = "Sorry, I couldn't understand your question. Try again with keywords like 'methods', 'results', or 'conclusion'."
            print(f"\n📝 Response:\n{section}")

        elif choice == "3":
            print("👋 Goodbye!")
            break
        else:
            print("❌ Invalid choice. Please try again.")

# Helper: Extract a specific section from text
def extract_section(text, keyword):
    keyword = keyword.lower()
    lines = text.splitlines()
    section = ""
    found = False
    for line in lines:
        if keyword in line.lower():
            found = True
        elif found and line.strip() == "":
            break
        if found:
            section += line + "\n"
    return section if section else "Section not found."

# Run the chatbot
if __name__ == "__main__":
    chatbot()
