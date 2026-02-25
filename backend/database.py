from sqlalchemy import create_engine
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

# Database connection details
DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "") # Default XAMPP password is empty
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "rental_pro")

def create_database_if_not_exists():
    try:
        # Connect to MySQL server without selecting a specific database
        connection = pymysql.connect(
            host=DB_HOST,
            user=DB_USER,
            password=DB_PASSWORD,
            port=int(DB_PORT)
        )
        cursor = connection.cursor()
        # Create database and ensure it supports utf8mb4 (emojis, etc.)
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci")
        connection.commit()
        cursor.close()
        connection.close()
        print(f"Database '{DB_NAME}' checked/created successfully.")
    except Exception as e:
        print(f"Error checking/creating database: {e}")

# Run this check once when this module is loaded
create_database_if_not_exists()

# Now create the SQLAlchemy engine connected to that specific database
DATABASE_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

engine = create_engine(DATABASE_URL, echo=False)

from sqlalchemy.ext.declarative import declarative_base
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
