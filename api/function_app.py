import azure.functions as func
import logging
from PIL import Image, ImageEnhance
import io
import fitz  # PyMuPDF

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

def apply_resize(image: Image.Image, req: func.HttpRequest) -> Image.Image:
    resize_mode = req.headers.get("X-Resize-Mode", "none")
    if resize_mode == "none":
        return image
        
    try:
        if resize_mode == "pixels":
            width = int(req.headers.get("X-Resize-Width", image.width))
            height = int(req.headers.get("X-Resize-Height", image.height))
            # Only resize if dimensions are positive
            if width > 0 and height > 0:
                image = image.resize((width, height), Image.Resampling.LANCZOS)
        elif resize_mode == "percent":
            percent = float(req.headers.get("X-Resize-Percent", 100.0))
            if percent > 0 and percent != 100.0:
                width = int(image.width * (percent / 100.0))
                height = int(image.height * (percent / 100.0))
                # Minimum size of 1x1 to prevent errors
                width = max(1, width)
                height = max(1, height)
                image = image.resize((width, height), Image.Resampling.LANCZOS)
    except Exception as e:
        logging.warning(f"Failed to apply resize: {e}")
        
    return image

@app.route(route="process-image", methods=["POST"])
def process_image(req: func.HttpRequest) -> func.HttpResponse:
    logging.info('Processing image request.')

    try:
        image_bytes = req.get_body()
        if not image_bytes:
            return func.HttpResponse(
                 "Please provide a file in the request body.",
                 status_code=400
            )

        conversion_type = req.headers.get("X-Conversion-Type", "grayscale")
        keep_exif = req.headers.get("X-Keep-Exif", "false").lower() == "true"
        
        output_stream = io.BytesIO()
        mimetype = "image/jpeg"

        if conversion_type == "pdf-to-jpg":
            pdf_document = fitz.open(stream=image_bytes, filetype="pdf")
            if pdf_document.page_count == 0:
                return func.HttpResponse("PDF is empty.", status_code=400)
            
            page = pdf_document.load_page(0)
            pix = page.get_pixmap(dpi=150)
            
            # For PDF, we load as image first, then apply resize
            image = Image.open(io.BytesIO(pix.tobytes("jpeg")))
            image = apply_resize(image, req)
            
            image.save(output_stream, format="JPEG", quality=90)
            output_stream.seek(0)
            mimetype = "image/jpeg"
            pdf_document.close()
        else:
            image = Image.open(io.BytesIO(image_bytes))
            
            # Extract EXIF before resizing (as resizing can drop it on some objects depending on implementation)
            exif_data = image.info.get("exif") if keep_exif else None
            
            # Apply resolution resize first
            image = apply_resize(image, req)
            
            # Setup save parameters (to dynamically include exif if requested)
            save_kwargs = {}
            if exif_data:
                save_kwargs['exif'] = exif_data

            if conversion_type == "grayscale":
                image = image.convert('L')
                # Legacy max size fallback only if no resize was explicitly requested
                if req.headers.get("X-Resize-Mode", "none") == "none":
                    image.thumbnail((1200, 1200)) 
                image.save(output_stream, format="JPEG", quality=85, **save_kwargs)
                mimetype = "image/jpeg"
                
            elif conversion_type == "to-pdf":
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output_stream, format="PDF", resolution=100.0) # PDF doesn't easily embed EXIF like JPEG
                mimetype = "application/pdf"
                
            elif conversion_type == "to-png":
                # PNG uses a different metadata chunk (pnginfo), but modern pillow can sometimes handle it.
                # Since keeping EXIF is rarely needed for PNG web use, we'll gracefully fallback without kwargs if it crashes, 
                # but standard save ignores `exif` kwarg on PNG safely in newer Pillow versions.
                try:
                    image.save(output_stream, format="PNG", **save_kwargs)
                except Exception:
                    image.save(output_stream, format="PNG")
                mimetype = "image/png"
                
            elif conversion_type == "to-jpg":
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output_stream, format="JPEG", quality=85, **save_kwargs)
                mimetype = "image/jpeg"

            elif conversion_type == "to-webp":
                if image.mode == 'RGBA':
                    image.save(output_stream, format="WEBP", lossless=False, quality=90, **save_kwargs)
                else:
                    image.save(output_stream, format="WEBP", quality=90, **save_kwargs)
                mimetype = "image/webp"

            elif conversion_type == "color-grade":
                # Enhance Color (Vibrancy)
                converter = ImageEnhance.Color(image)
                image = converter.enhance(1.4)
                # Enhance Contrast
                converter = ImageEnhance.Contrast(image)
                image = converter.enhance(1.1)
                
                if image.mode == 'RGBA':
                    image = image.convert('RGB')
                image.save(output_stream, format="JPEG", quality=90, **save_kwargs)
                mimetype = "image/jpeg"
                
            else:
                return func.HttpResponse("Invalid conversion type.", status_code=400)

            output_stream.seek(0)
        
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
