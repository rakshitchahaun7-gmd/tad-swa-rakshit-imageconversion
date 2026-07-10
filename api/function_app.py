import azure.functions as func
import logging
from PIL import Image
import io
import fitz  # PyMuPDF

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

@app.route(route="process-image", methods=["POST"])
def process_image(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Processing image request.')

    try:
        # The frontend will send the raw file bytes in the request body
        image_bytes = req.get_body()
        if not image_bytes:
            return func.HttpResponse(
                 "Please provide a file in the request body.",
                 status_code=400
            )

        conversion_type = req.headers.get("X-Conversion-Type", "grayscale")
        output_stream = io.BytesIO()
        mimetype = "image/jpeg"

        if conversion_type == "pdf-to-jpg":
            # Handle PDF to JPG
            pdf_document = fitz.open(stream=image_bytes, filetype="pdf")
            if pdf_document.page_count == 0:
                return func.HttpResponse("PDF is empty.", status_code=400)
            
            page = pdf_document.load_page(0) # First page
            pix = page.get_pixmap(dpi=150) # High quality image
            output_stream.write(pix.tobytes("jpeg"))
            output_stream.seek(0)
            mimetype = "image/jpeg"
            pdf_document.close()

        else:
            # All other conversions assume the input is an Image
            image = Image.open(io.BytesIO(image_bytes))
            
            if conversion_type == "grayscale":
                image = image.convert('L')
                image.thumbnail((1200, 1200))
                image.save(output_stream, format="JPEG", quality=85)
                mimetype = "image/jpeg"
                
            elif conversion_type == "to-pdf":
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output_stream, format="PDF", resolution=100.0)
                mimetype = "application/pdf"
                
            elif conversion_type == "to-png":
                image.save(output_stream, format="PNG")
                mimetype = "image/png"
                
            elif conversion_type == "to-jpg":
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output_stream, format="JPEG", quality=85)
                mimetype = "image/jpeg"
                
            else:
                return func.HttpResponse("Invalid conversion type.", status_code=400)

            output_stream.seek(0)
        
        # Return the processed file
        return func.HttpResponse(
            body=output_stream.read(),
            mimetype=mimetype,
            status_code=200
        )
    except Exception as e:
        logging.error(f"Error processing file: {e}")
        return func.HttpResponse(
             f"Error processing file: {str(e)}",
             status_code=500
        )
