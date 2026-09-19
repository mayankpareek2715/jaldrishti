package com.jaldrishti.config;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import javax.sql.DataSource;

@Configuration
@Slf4j
public class DataSourceConfig {

    @Value("${spring.datasource.url:}")
    private String configuredUrl;

    @Value("${spring.datasource.username:}")
    private String configuredUsername;

    @Value("${spring.datasource.password:}")
    private String configuredPassword;

    @Value("${DB_HOST:}")
    private String dbHost;

    @Value("${DB_PORT:5432}")
    private String dbPort;

    @Value("${DB_NAME:jaldrishti}")
    private String dbName;

    @Value("${DB_USERNAME:}")
    private String dbUsername;

    @Value("${DB_PASSWORD:}")
    private String dbPassword;

    @Value("${DATABASE_URL:}")
    private String databaseUrl;

    @Bean
    @Primary
    public DataSource dataSource() {
        HikariConfig config = new HikariConfig();

        String url = null;
        String user = null;
        String pass = null;

        // Priority 1: DB_HOST provided (Render Blueprint, Docker, or custom container env)
        if (dbHost != null && !dbHost.isBlank()) {
            url = "jdbc:postgresql://" + dbHost + ":" + dbPort + "/" + dbName;
            user = (dbUsername != null && !dbUsername.isBlank()) ? dbUsername : "postgres";
            pass = (dbPassword != null) ? dbPassword : "";
            log.info("Configuring PostgreSQL datasource from DB_HOST={}:{}", dbHost, dbPort);
        }
        // Priority 2: DATABASE_URL provided (standard cloud provider URL)
        else if (databaseUrl != null && !databaseUrl.isBlank()) {
            String sanitized = databaseUrl.trim();
            if (sanitized.startsWith("postgres://")) {
                sanitized = "jdbc:postgresql://" + sanitized.substring("postgres://".length());
            } else if (sanitized.startsWith("postgresql://")) {
                sanitized = "jdbc:postgresql://" + sanitized.substring("postgresql://".length());
            }
            url = sanitized;
            user = (configuredUsername != null && !configuredUsername.isBlank()) ? configuredUsername : "postgres";
            pass = configuredPassword;
            log.info("Configuring PostgreSQL datasource from DATABASE_URL");
        }
        // Priority 3: Explicit spring.datasource.url configured
        else if (configuredUrl != null && !configuredUrl.isBlank()) {
            String sanitized = configuredUrl.trim();
            if (sanitized.startsWith("postgres://")) {
                sanitized = "jdbc:postgresql://" + sanitized.substring("postgres://".length());
            } else if (sanitized.startsWith("postgresql://")) {
                sanitized = "jdbc:postgresql://" + sanitized.substring("postgresql://".length());
            }
            url = sanitized;
            user = (configuredUsername != null && !configuredUsername.isBlank()) ? configuredUsername : "sa";
            pass = configuredPassword;
            log.info("Configuring datasource from spring.datasource.url={}", url.split("\\?")[0]);
        }
        // Priority 4: Local development fallback (in-memory H2 with PostgreSQL compatibility)
        else {
            url = "jdbc:h2:mem:jaldrishti;DB_CLOSE_DELAY=-1;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE";
            user = "sa";
            pass = "";
            log.info("No external database configured. Defaulting to local H2 in-memory database.");
        }

        config.setJdbcUrl(url);
        if (user != null && !user.isBlank()) {
            config.setUsername(user);
        }
        if (pass != null) {
            config.setPassword(pass);
        }

        if (url.startsWith("jdbc:h2:")) {
            config.setDriverClassName("org.h2.Driver");
        } else if (url.startsWith("jdbc:postgresql:")) {
            config.setDriverClassName("org.postgresql.Driver");
        }

        config.setMaximumPoolSize(10);
        config.setMinimumIdle(2);
        config.setIdleTimeout(30000);
        config.setConnectionTimeout(30000);

        return new HikariDataSource(config);
    }
}
