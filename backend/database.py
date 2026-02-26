from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection details
DATABASE_URL = os.getenv("DATABASE_URL")

# Connect to the cloud provider directly 
if DATABASE_URL:
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Safely print without leaking credentials or raising IndexError
    db_host = DATABASE_URL.split('@')[1] if '@' in DATABASE_URL else "Local/Unknown"
    print(f"Using Cloud Database: {db_host}")
    
    # Pre-ping is necessary on Render/Heroku to avoid "server closed the connection unexpectedly" errors
    engine = create_engine(DATABASE_URL, pool_pre_ping=True, echo=False)
else:
    import pymysql
    DB_USER = os.getenv("DB_USER", "root")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "") # Default XAMPP password is empty
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = os.getenv("DB_PORT", "3306")
    DB_NAME = os.getenv("DB_NAME", "rental_pro")

    def create_database_if_not_exists():
        try:
            connection = pymysql.connect(
                host=DB_HOST, user=DB_USER, password=DB_PASSWORD, port=int(DB_PORT)
            )
            cursor = connection.cursor()
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
            connection.commit()
            cursor.close()
            connection.close()
            print(f"Local database '{DB_NAME}' checked/created successfully.")
        except Exception as e:
            print(f"Error checking/creating database: {e}")

    create_database_if_not_exists()
    LOCAL_DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    engine = create_engine(LOCAL_DATABASE_URL, pool_pre_ping=True, echo=False)

from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency for FastAPI to get a DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
